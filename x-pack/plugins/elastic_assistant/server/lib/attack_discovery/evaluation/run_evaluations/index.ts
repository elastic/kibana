/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { Connector } from '@kbn/actions-plugin/server/application/connector/types';
import { Logger } from '@kbn/core/server';
import { asyncForEach } from '@kbn/std';
import { PublicMethodsOf } from '@kbn/utility-types';
import { Client } from 'langsmith';
import { evaluate } from 'langsmith/evaluation';

import { getEvaluatorLlm } from '../helpers/get_evaluator_llm';
import { getCustomEvaluator } from '../helpers/get_custom_evaluator';
import { getDefaultPromptTemplate } from '../helpers/get_custom_evaluator/get_default_prompt_template';
import { getGraphInputOverrides } from '../helpers/get_graph_input_overrides';
import { DefaultAttackDiscoveryGraph } from '../../graphs/default_attack_discovery_graph';
import { GraphState } from '../../graphs/default_attack_discovery_graph/types';

/**
 * Runs an evaluation for each graph so they show up separately (resulting in
 * each dataset run grouped by connector)
 */
export const runEvaluations = async ({
  actionsClient,
  connectors,
  connectorTimeout,
  evaluatorConnectorId,
  datasetName,
  graphs,
  langSmithApiKey,
  logger,
}: {
  actionsClient: PublicMethodsOf<ActionsClient>;
  connectors: Connector[];
  connectorTimeout: number;
  evaluatorConnectorId: string | undefined;
  datasetName: string;
  graphs: Array<{
    connector: Connector;
    graph: DefaultAttackDiscoveryGraph;
    llmType: string | undefined;
    name: string;
  }>;
  langSmithApiKey: string | undefined;
  logger: Logger;
}): Promise<void> =>
  asyncForEach(graphs, async ({ connector, graph, llmType, name }) => {
    const subject = `connector "${connector.name}" (${llmType}), running experiment "${name}"`;

    try {
      logger.info(
        () =>
          `Evaluating ${subject} with dataset "${datasetName}" and evaluator "${evaluatorConnectorId}"`
      );

      const predict = async (input: unknown): Promise<GraphState> => {
        logger.debug(
          () => `Raw example Input for ${subject}":\n ${JSON.stringify(input, null, 2)}`
        );

        // The example `Input` may have overrides for the initial state of the graph:
        const overrides = getGraphInputOverrides(input);

        return graph.invoke(
          {
            ...overrides,
          },
          {
            runName: name,
            tags: ['evaluation', llmType ?? ''],
          }
        );
      };

      const llm = await getEvaluatorLlm({
        actionsClient,
        connectors,
        connectorTimeout,
        evaluatorConnectorId,
        experimentConnector: connector,
        logger,
      });

      const customEvaluator = getCustomEvaluator({
        criteria: 'correctness',
        key: 'attack_discovery_correctness',
        llm,
        template: getDefaultPromptTemplate(),
      });

      const evalOutput = await evaluate(predict, {
        client: new Client({ apiKey: langSmithApiKey }),
        data: datasetName ?? '',
        evaluators: [customEvaluator],
        experimentPrefix: name,
        maxConcurrency: 5, // prevents rate limiting
      });

      logger.info(() => `Evaluation complete for ${subject}`);

      logger.debug(
        () => `Evaluation output for ${subject}:\n ${JSON.stringify(evalOutput, null, 2)}`
      );
    } catch (e) {
      logger.error(`Error evaluating ${subject}: ${e}`);
    }
  });
