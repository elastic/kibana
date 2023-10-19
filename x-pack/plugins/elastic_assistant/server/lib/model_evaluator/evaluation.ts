/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loadEvaluator } from 'langchain/evaluation';
import { LLM } from 'langchain/llms/base';
import { ChainValues, HumanMessage } from 'langchain/schema';
import { chunk } from 'lodash/fp';
import { Logger } from '@kbn/core/server';
import { ToolingLog } from '@kbn/tooling-log';
import { asyncForEach } from '@kbn/std';
import { AgentExecutorEvaluator } from '../langchain/executors/types';
import { Dataset } from '../../schemas/evaluate/post_evaluate';
import { callAgentWithRetry, getMessageFromLangChainResponse, wait } from './utils';
import { ResponseBody } from '../langchain/types';

export interface PerformEvaluationParams {
  agentExecutorEvaluators: AgentExecutorEvaluator[];
  dataset: Dataset;
  evaluationId: string;
  evaluatorModel: LLM;
  evaluationPrompt?: string;
  evaluationType: string;
  maxConcurrency?: number;
  logger: Logger | ToolingLog;
}

export interface EvaluationResult {
  '@timestamp': string;
  evaluation: ChainValues;
  evaluationId: string;
  input: string;
  prediction: string;
  predictionResponse: PromiseSettledResult<ResponseBody>;
  reference: string;
}

export interface EvaluationSummary {
  '@timestamp': string;
  evaluationStart: number;
  evaluationEnd: number;
  evaluationId: string;
  evaluationDuration: number;
  totalAgents: number;
  totalRequests: number;
  totalInput: number;
}

/**
 * Evaluates a dataset based on an evaluation rubric. Takes dataset of input/reference pairs,
 * and fetches the output (prediction) of the input against the provided agent executors.
 * Then evaluates all three using the provided evaluation rubric.
 */
export const performEvaluation = async ({
  agentExecutorEvaluators,
  dataset,
  evaluationId,
  evaluatorModel,
  evaluationPrompt,
  evaluationType,
  maxConcurrency = 3,
  logger,
}: PerformEvaluationParams) => {
  const startTime = new Date().getTime();
  const evaluationResults: EvaluationResult[] = [];

  const predictionRequests = dataset.flatMap(({ input, reference }) =>
    agentExecutorEvaluators.map((agent) => ({
      input,
      reference,
      request: callAgentWithRetry({ agent, messages: [new HumanMessage(input)], logger }),
    }))
  );

  logger.info(`Total prediction requests: ${predictionRequests.length}`);
  logger.info(`Chunk size: ${maxConcurrency}`);
  logger.info('Fetching predictions...');
  const requestChunks = chunk(maxConcurrency, predictionRequests);
  await asyncForEach(requestChunks, async (c, i) => {
    logger.info(`Prediction request chunk: ${i + 1} of ${requestChunks.length}`);

    // Note, order is kept between chunk and dataset, and is preserved w/ Promise.allSettled
    const chunkResults = await Promise.allSettled(c.map((r) => r.request));
    logger.info(`Prediction request chunk ${i + 1} response:\n${JSON.stringify(chunkResults)}`);
    chunkResults.forEach((response, chunkResultIndex) =>
      evaluationResults.push({
        '@timestamp': new Date().toISOString(),
        input: c[chunkResultIndex].input,
        reference: c[chunkResultIndex].reference,
        evaluationId,
        evaluation: {},
        prediction: getMessageFromLangChainResponse(response),
        predictionResponse: response,
      })
    );
  });

  logger.info(`Prediction results:\n${JSON.stringify(evaluationResults)}`);

  logger.info('Performing evaluation....');
  logger.info(`Evaluation model: ${evaluatorModel._llmType()}`);

  if (evaluationType === 'correctness') {
    logger.info('Evaluation type: correctness');
    const evaluator = await loadEvaluator('labeled_criteria', {
      criteria: 'correctness',
      llm: evaluatorModel,
    });
    await asyncForEach(evaluationResults, async ({ input, prediction, reference }, index) => {
      // TODO: Rate limit evaluator calls, though haven't seen any `429`'s yet in testing datasets up to 10 w/ azure/bedrock
      const evaluation = await evaluator.evaluateStrings({
        input,
        prediction,
        reference,
      });
      evaluationResults[index].evaluation = evaluation;
      await wait(1000);
    });
  } else if (evaluationType === 'esql-validator') {
    logger.info('Evaluation type: esql-validator');
    // TODO: Implement esql-validator here
  } else if (evaluationType === 'custom') {
    logger.info('Evaluation type: custom');
    // TODO: Implement custom evaluation here
  }

  const endTime = new Date().getTime();

  const evaluationSummary: EvaluationSummary = {
    evaluationId,
    '@timestamp': new Date().toISOString(),
    evaluationStart: startTime,
    evaluationEnd: endTime,
    evaluationDuration: endTime - startTime,
    totalAgents: agentExecutorEvaluators.length,
    totalInput: dataset.length,
    totalRequests: predictionRequests.length,
  };

  logger.info(`Final results:\n${JSON.stringify(evaluationResults, null, 2)}`);

  return { evaluationResults, evaluationSummary };
};
