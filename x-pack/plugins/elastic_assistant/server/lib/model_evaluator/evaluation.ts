/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
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
  evaluatorModel: LLM;
  evaluationPrompt?: string;
  evaluationType: string;
  maxConcurrency?: number;
  logger: Logger | ToolingLog;
}

export interface EvaluationResult {
  evaluation: ChainValues;
  input: string;
  prediction: string;
  predictionResponse: PromiseSettledResult<ResponseBody>;
  reference: string;
}

/**
 * Evaluates a dataset based on an evaluation rubric. Takes dataset of input/reference pairs,
 * and fetches the output (prediction) of the input against the provided agent executors.
 * Then evaluates all three using the provided evaluation rubric.
 */
export const performEvaluation = async ({
  agentExecutorEvaluators,
  dataset,
  evaluatorModel,
  evaluationPrompt,
  evaluationType,
  maxConcurrency = 3,
  logger,
}: PerformEvaluationParams) => {
  const startTime = new Date().getTime();
  const results: Array<PromiseSettledResult<ResponseBody>> = [];
  const requests = dataset.flatMap(({ input }) =>
    agentExecutorEvaluators.map((agent) =>
      callAgentWithRetry({ agent, messages: [new HumanMessage(input)], logger })
    )
  );

  logger.info(`Total requests: ${requests.length}`);
  logger.info(`Chunk size: ${maxConcurrency}`);
  logger.info('Fetching predictions...');
  const requestChunks = chunk(maxConcurrency, requests);
  for (let i = 0; i < requestChunks.length; i++) {
    logger.info(`Request chunk [${i}]: ${requestChunks[i].length}`);

    const chunkResults = await Promise.allSettled(requestChunks[i]);
    logger.info(`Chunk results:\n${JSON.stringify(chunkResults)}`);
    results.push(...chunkResults);
  }

  const mergedResults = dataset.map((d, i) => ({
    ...d,
    prediction: getMessageFromLangChainResponse(results[i]),
    predictionResponse: results[i],
  }));

  logger.info(`Prediction results:\n${JSON.stringify(mergedResults)}`);

  logger.info('Performing evaluation....');
  const finalResults: ChainValues[] = [];

  if (evaluationType === 'correctness') {
    const evaluator = await loadEvaluator('labeled_criteria', {
      criteria: 'correctness',
      llm: evaluatorModel,
    });
    await asyncForEach(mergedResults, async ({ input, prediction, reference }) => {
      const res = await evaluator.evaluateStrings({ input, prediction, reference });
      finalResults.push(res);
      await wait(1000);
    });
  } else if (evaluationType === 'esql-validator') {
    // TODO: Implement esql-validator here
  } else if (evaluationType === 'custom') {
    // TODO: Implement custom evaluation here
  }

  // Merge final evaluation results w/ dataset
  const evalResults = mergedResults.map((d, i) => ({
    ...d,
    evaluation: finalResults[i],
  }));
  const endTime = new Date().getTime();

  const executionSummary = {
    evaluationId: uuidv4(),
    evaluationDuration: endTime - startTime,
    totalAgents: agentExecutorEvaluators.length,
    totalRequests: requests.length,
    totalInput: dataset.length,
  };

  logger.info(`Final results:\n${JSON.stringify(evalResults)}`);

  return { evalResults, executionSummary };
};
