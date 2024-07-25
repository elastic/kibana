/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loadEvaluator } from 'langchain/evaluation';
import { LLM } from '@langchain/core/language_models/llms';
import { ChainValues } from '@langchain/core/utils/types';
import { HumanMessage } from '@langchain/core/messages';
import { chunk as createChunks } from 'lodash/fp';
import { Logger } from '@kbn/core/server';
import { ToolingLog } from '@kbn/tooling-log';
import { LangChainTracer } from '@langchain/core/tracers/tracer_langchain';
import { RunCollectorCallbackHandler } from '@langchain/core/tracers/run_collector';
import { Dataset } from '@kbn/elastic-assistant-common';
import { isLangSmithEnabled } from '@kbn/langchain/server/tracers/langsmith';
import { AgentExecutorEvaluatorWithMetadata } from '../langchain/executors/types';
import { callAgentWithRetry, getMessageFromLangChainResponse } from './utils';
import { writeLangSmithFeedback } from '../../routes/evaluate/utils';
import { ResponseBody } from '../langchain/types';

export interface PerformEvaluationParams {
  agentExecutorEvaluators: AgentExecutorEvaluatorWithMetadata[];
  dataset: Dataset;
  evaluationId: string;
  evaluatorModel?: LLM;
  evaluationPrompt?: string;
  evaluationType?: string;
  logger: Logger | ToolingLog;
  maxConcurrency?: number;
  runName?: string;
}

export interface EvaluationResult {
  '@timestamp': string;
  connectorName: string;
  evaluation: ChainValues;
  evaluationId: string;
  input: string;
  inputExampleId?: string | undefined;
  langSmithLink?: string | undefined;
  prediction: string;
  predictionResponse: PromiseSettledResult<ResponseBody>;
  reference: string;
  runName: string;
}

export interface EvaluationSummary {
  '@timestamp': string;
  evaluationStart: number;
  evaluationEnd: number;
  evaluationId: string;
  evaluationDuration: number;
  langSmithLink?: string | undefined;
  runName: string;
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
  maxConcurrency = 1,
  logger,
  runName = 'default-run-name',
}: PerformEvaluationParams) => {
  const startTime = new Date().getTime();
  const evaluationResults: EvaluationResult[] = [];

  const predictionRequests = dataset.flatMap(({ input, reference, id: exampleId }) =>
    agentExecutorEvaluators.map(
      ({ agentEvaluator: agent, metadata: { connectorName, runName: agentRunName } }) => ({
        connectorName,
        input,
        reference,
        exampleId,
        request: () =>
          callAgentWithRetry({ agent, exampleId, messages: [new HumanMessage(input)], logger }),
        runName: agentRunName,
      })
    )
  );

  const requestChunks = createChunks(maxConcurrency, predictionRequests);
  const totalChunks = requestChunks.length;

  logger.info(`Total prediction requests: ${predictionRequests.length}`);
  logger.info(`Chunk size (maxConcurrency): ${maxConcurrency}`);
  logger.info(`Total chunks: ${totalChunks}`);
  logger.info('Fetching predictions...');

  while (requestChunks.length) {
    const chunk = requestChunks.shift() ?? [];
    const chunkNumber = totalChunks - requestChunks.length;
    logger.info(`Prediction request chunk: ${chunkNumber} of ${totalChunks}`);

    // Note, order is kept between chunk and dataset, and is preserved w/ Promise.allSettled
    const chunkResults = await Promise.allSettled(chunk.map((r) => r.request()));
    logger.info(
      `Prediction request chunk ${chunkNumber} response:\n${JSON.stringify(chunkResults)}`
    );
    chunkResults.forEach((response, chunkResultIndex) =>
      evaluationResults.push({
        '@timestamp': new Date().toISOString(),
        connectorName: chunk[chunkResultIndex].connectorName,
        input: chunk[chunkResultIndex].input,
        inputExampleId: chunk[chunkResultIndex].exampleId,
        reference: chunk[chunkResultIndex].reference,
        evaluationId,
        evaluation: {},
        prediction: getMessageFromLangChainResponse(response),
        predictionResponse: response,
        runName: chunk[chunkResultIndex].runName,
      })
    );
  }

  logger.info(`Prediction results:\n${JSON.stringify(evaluationResults)}`);

  if (evaluatorModel == null) {
    const endTime = new Date().getTime();

    const evaluationSummary: EvaluationSummary = {
      evaluationId,
      '@timestamp': new Date().toISOString(),
      evaluationStart: startTime,
      evaluationEnd: endTime,
      evaluationDuration: endTime - startTime,
      runName,
      totalAgents: agentExecutorEvaluators.length,
      totalInput: dataset.length,
      totalRequests: predictionRequests.length,
    };

    logger.info(`Final results:\n${JSON.stringify(evaluationResults)}`);

    return { evaluationResults, evaluationSummary };
  }

  // Continue with actual evaluation if expected
  logger.info('Performing evaluation....');
  logger.info(`Evaluation model: ${evaluatorModel._llmType()}`);

  if (evaluationType === 'correctness') {
    logger.info('Evaluation type: correctness');
    const evaluator = await loadEvaluator('labeled_criteria', {
      criteria: 'correctness',
      llm: evaluatorModel,
    });

    for (const result of evaluationResults) {
      const { input, inputExampleId: exampleId, prediction, reference } = result;
      // Create an eval tracer so eval traces end up in the right project (runName in this instance as to correlate
      // with the test run), don't supply `exampleID` as that results in a new Dataset `Test` run being created and
      // polluting the `predictions` that ran above
      const evalTracer = new LangChainTracer({
        projectName: runName,
      });
      // Create RunCollector for uploading evals to LangSmith, no TS variant for `EvaluatorCallbackHandler` or
      // `run_on_dataset` w/ eval config, so using `RunCollectorCallbackHandler` and then uploading manually via
      // client.createFeedback()
      // See: https://github.com/langchain-ai/langsmith-sdk/blob/18449e5848d85ac0a320f320c37f454f949de1e1/js/src/client.ts#L1249-L1256
      const runCollector = new RunCollectorCallbackHandler({ exampleId });
      const evaluation = await evaluator.evaluateStrings(
        {
          input,
          prediction,
          reference,
        },
        {
          callbacks: [...(isLangSmithEnabled() ? [evalTracer, runCollector] : [])],
          tags: ['security-assistant-evaluation'],
        }
      );
      result.evaluation = evaluation;

      // Write to LangSmith
      if (isLangSmithEnabled()) {
        const langSmithLink = await writeLangSmithFeedback(
          runCollector.tracedRuns[0],
          evaluationId,
          logger
        );
        result.langSmithLink = langSmithLink;
      }
    }
  } else if (evaluationType === 'esql-validator') {
    logger.info('Evaluation type: esql-validator');
    // TODO: Implement esql-validator here
  } else if (evaluationType === 'custom') {
    logger.info('Evaluation type: custom');
    // TODO: Implement custom evaluation here
    // const llm = new ChatOpenAI({ temperature: 0, tags: ["my-llm-tag"] });
    // const prompt = PromptTemplate.fromTemplate("Say {input}");
    // const chain = prompt.pipe(llm).withConfig( { tags: ["my-bash-tag", "another-tag"] });
    // await chain.invoke({ input: "Hello, World!"}, { tags: ["shared-tags"] });
  }

  const endTime = new Date().getTime();

  const evaluationSummary: EvaluationSummary = {
    evaluationId,
    '@timestamp': new Date().toISOString(),
    evaluationStart: startTime,
    evaluationEnd: endTime,
    evaluationDuration: endTime - startTime,
    runName,
    totalAgents: agentExecutorEvaluators.length,
    totalInput: dataset.length,
    totalRequests: predictionRequests.length,
  };

  logger.info(`Final results:\n${JSON.stringify(evaluationResults)}`);

  return { evaluationResults, evaluationSummary };
};
