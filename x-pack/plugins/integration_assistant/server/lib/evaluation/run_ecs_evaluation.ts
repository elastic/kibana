/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { Connector } from '@kbn/actions-plugin/server/application/connector/types';
import { Logger } from '@kbn/core/server';
import type { LangChainTracer } from '@langchain/core/tracers/tracer_langchain';
import { getLangSmithTracer } from '@kbn/langchain/server/tracers/langsmith';
import { asyncForEach } from '@kbn/std';
import { PublicMethodsOf } from '@kbn/utility-types';

import { runEvaluations } from './run_evaluations';
import { EcsGraphMetadata } from '../../graphs';
import { EcsGraph } from '../../graphs/ecs/graph';
import { getLLMClass, getLLMType } from '../../util/llm';

export const evaluateGraph = async ({
  actionsClient,
  ecsGraphs,
  connectors,
  connectorTimeout,
  datasetName,
  abortSignal,
  evaluationId,
  evaluatorConnectorId,
  langSmithApiKey,
  langSmithProject,
  logger,
  runName,
}: {
  actionsClient: PublicMethodsOf<ActionsClient>;
  ecsGraphs: EcsGraphMetadata[];
  connectors: Connector[];
  connectorTimeout: number;
  datasetName: string;
  abortSignal: AbortSignal;
  evaluationId: string;
  evaluatorConnectorId: string | undefined;
  langSmithApiKey: string | undefined;
  langSmithProject: string | undefined;
  logger: Logger;
  runName: string;
}): Promise<void> => {
  await asyncForEach(ecsGraphs, async ({ getEcsGraph }) => {
    // create a graph for every connector:
    const graphs: Array<{
      connector: Connector;
      graph: EcsGraph;
      llmType: string | undefined;
      name: string;
      traceOptions: {
        projectName: string | undefined;
        tracers: LangChainTracer[];
      };
    }> = connectors.map((connector) => {
      const llmType = getLLMType(connector.actionTypeId);

      const traceOptions = {
        projectName: langSmithProject,
        tracers: [
          ...getLangSmithTracer({
            apiKey: langSmithApiKey,
            projectName: langSmithProject,
            logger,
          }),
        ],
      };
      const llmClass = getLLMClass(llmType);
      const model = new llmClass({
        actionsClient,
        connectorId: connector.id,
        logger,
        llmType,
        model: connector.config?.defaultModel,
        temperature: 0,
        signal: abortSignal,
        streaming: false,
      });

      const graph = getEcsGraph({ model });

      return {
        connector,
        graph,
        llmType,
        name: `${runName} - ${connector.name} - ${evaluationId} - ECS`,
        traceOptions,
      };
    });

    // run the evaluations for each graph:
    await runEvaluations({
      actionsClient,
      connectorTimeout,
      evaluatorConnectorId,
      datasetName,
      graphs,
      langSmithApiKey,
      logger,
    });
  });
};
