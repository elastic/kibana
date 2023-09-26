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
import { wait } from './utils';

export interface PerformEvaluationParams {
  agentExecutorEvaluators: AgentExecutorEvaluator[];
  dataset: Dataset;
  evaluatorModel: LLM;
  evaluationPrompt?: string;
  evaluationType: string;
  maxConcurrency?: number;
  logger: Logger | ToolingLog;
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
  const INPUT_POSTFIX = 'Only return the ESQL query, do not wrap in a codeblock.';

  const results: ChainValues = [];
  const requests = dataset.flatMap(({ input }) =>
    agentExecutorEvaluators.map((agent) => agent([new HumanMessage(`${input} ${INPUT_POSTFIX}`)]))
  );

  logger.info(`Total Requests: ${requests.length}`);

  logger.info('Fetching predictions...');
  const requestChunks = chunk(maxConcurrency, requests);
  for (let i = 0; i < requestChunks.length; i++) {
    logger.info(`Request chunk [${i}]: ${requestChunks[i].length}`);

    const chunkResults = await Promise.all(requestChunks[i]);
    logger.info('Chunk Results:');
    logger.info(JSON.stringify(chunkResults, null, 2));
    results.push(...chunkResults);
  }

  const mergedResults = dataset.map((d, i) => ({
    ...d,
    prediction: results[i]?.text ?? 'error',
  }));

  logger.info('Prediction results:');
  logger.info(JSON.stringify(mergedResults));

  logger.info('Performing evaluation....');
  const finalResults: ChainValues[] = [];

  const evaluator = await loadEvaluator('labeled_criteria', {
    criteria: 'correctness',
    llm: evaluatorModel,
  });

  await asyncForEach(mergedResults, async ({ input, prediction, reference }) => {
    const res = await evaluator.evaluateStrings({ input, prediction, reference });
    finalResults.push(res);
    await wait(1000);
  });

  logger.info('Final results:');
  logger.info(JSON.stringify(finalResults));

  return finalResults;
};
