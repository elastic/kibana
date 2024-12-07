/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Connector } from '@kbn/actions-plugin/server/application/connector/types';
import { Logger } from '@kbn/core/server';
import type { LangChainTracer } from '@langchain/core/tracers/tracer_langchain';
import { asyncForEach } from '@kbn/std';
import { Client } from 'langsmith';
import { evaluate } from 'langsmith/evaluation';

import { PublicMethodsOf } from '@kbn/utility-types';
import { ActionsClient } from '@kbn/actions-plugin/server';
import { EcsGraph } from '../../../graphs/ecs/graph';
import { getEvaluatorLlm } from '../helpers/get_evaluator_llm';
import { getCustomEvaluator } from '../helpers/get_custom_evaluator';
import { getDefaultPromptTemplate } from '../helpers/get_default_prompt_template';
import { ExampleInput } from '../example_input';

/**
 * Runs an evaluation for each graph so they show up separately (resulting in
 * each dataset run grouped by connector)
 */
export const runEvaluations = async ({
  actionsClient,
  connectorTimeout,
  evaluatorConnectorId,
  datasetName,
  graphs,
  langSmithApiKey,
  logger,
}: {
  actionsClient: PublicMethodsOf<ActionsClient>;
  connectorTimeout: number;
  evaluatorConnectorId: string | undefined;
  datasetName: string;
  graphs: Array<{
    connector: Connector;
    graph: EcsGraph;
    llmType: string | undefined;
    name: string;
    traceOptions: {
      projectName: string | undefined;
      tracers: LangChainTracer[];
    };
  }>;
  langSmithApiKey: string | undefined;
  logger: Logger;
}): Promise<void> =>
  asyncForEach(graphs, async ({ connector, graph, llmType, name, traceOptions }) => {
    const subject = `connector "${connector.name}" (${llmType}), running experiment "${name}"`;

    try {
      logger.info(() => `Evaluating ${subject} with dataset "${datasetName}" and graph "${graph}"`);

      const predict = async (input: ExampleInput): Promise<object> => {
        logger.info(() => `Raw example Input for ${subject}":\n ${input}`);

        return graph.invoke(
          {
            packageName: 'broadcom',
            dataStreamName: 'activity',
            rawSamples: input.rawSamples,
            samplesFormat: input.samplesFormat,
            additionalProcessors: input.additionalProcessors,
          },
          {
            callbacks: [...(traceOptions.tracers ?? [])],
            runName: 'test-ecs-evaluate',
            tags: ['evaluation', llmType ?? ''],
          }
        );
      };

      const claude = await getEvaluatorLlm({
        actionsClient,
        connectorTimeout,
        evaluatorConnectorId,
        experimentConnector: connector,
        langSmithApiKey,
        logger,
      });

      // const openai = await getEvaluatorLlm({
      //   actionsClient,
      //   connectorTimeout,
      //   evaluatorConnectorId: "azure-open-ai",
      //   experimentConnector: connector,
      //   langSmithApiKey,
      //   logger,
      // });

      const customEvaluatorClaude = getCustomEvaluator({
        criteria: 'correctness',
        key: 'ecs_mapping_correctness',
        llm: claude,
        template: getDefaultPromptTemplate(),
      });

      // const customEvaluatorOpenai = getCustomEvaluator({
      //   criteria: 'correctness',
      //   key: 'ecs_mapping_correctness',
      //   llm: openai,
      //   template: getDefaultPromptTemplate(),
      // });

      const evalClaudeOutput = await evaluate(predict, {
        client: new Client({ apiKey: langSmithApiKey }),
        data: datasetName ?? '',
        evaluators: [customEvaluatorClaude],
        experimentPrefix: name,
        maxConcurrency: 5, // prevents rate limiting
      });

      logger.info(() => `Evaluation complete for ${subject}`);

      logger.debug(
        () => `Evaluation output for ${subject}:\n ${JSON.stringify(evalClaudeOutput, null, 2)}`
      );
    } catch (e) {
      logger.error(`Error evaluating ${subject}: ${e}`);
    }
  });
