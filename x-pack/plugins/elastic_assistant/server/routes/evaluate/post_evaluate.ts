/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter, KibanaRequest, Logger } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { v4 as uuidv4 } from 'uuid';

import { ESQL_RESOURCE } from '../knowledge_base/constants';
import { buildResponse } from '../../lib/build_response';
import { buildRouteValidation } from '../../schemas/common';
import { ElasticAssistantRequestHandlerContext, GetElser } from '../../types';
import { EVALUATE } from '../../../common/constants';
import { PostEvaluateBody, PostEvaluatePathQuery } from '../../schemas/evaluate/post_evaluate';
import { performEvaluation } from '../../lib/model_evaluator/evaluation';
import { callAgentExecutor } from '../../lib/langchain/execute_custom_llm_chain';
import { callOpenAIFunctionsExecutor } from '../../lib/langchain/executors/openai_functions_executor';
import { AgentExecutor, AgentExecutorEvaluator } from '../../lib/langchain/executors/types';
import { ActionsClientLlm } from '../../lib/langchain/llm/actions_client_llm';
import {
  indexEvaluations,
  setupEvaluationIndex,
} from '../../lib/model_evaluator/output_index/utils';
import { getLlmType } from './utils';
import { RequestBody } from '../../lib/langchain/types';

/**
 * To support additional Agent Executors from the UI, add them to this map
 * and reference your specific AgentExecutor function
 */
const AGENT_EXECUTOR_MAP: Record<string, AgentExecutor> = {
  DefaultAgentExecutor: callAgentExecutor,
  OpenAIFunctionsExecutor: callOpenAIFunctionsExecutor,
};

export const postEvaluateRoute = (
  router: IRouter<ElasticAssistantRequestHandlerContext>,
  getElser: GetElser
) => {
  router.post(
    {
      path: EVALUATE,
      validate: {
        body: buildRouteValidation(PostEvaluateBody),
        query: buildRouteValidation(PostEvaluatePathQuery),
      },
    },
    async (context, request, response) => {
      // TODO: Limit route based on experimental feature
      const resp = buildResponse(response);
      const logger: Logger = (await context.elasticAssistant).logger;

      const { evalModel, evaluationType, outputIndex } = request.query;
      const { dataset, evalPrompt } = request.body;
      const connectorIds = request.query.models?.split(',') || [];
      const agentNames = request.query.agents?.split(',') || [];

      const evaluationId = uuidv4();

      logger.info('postEvaluateRoute:');
      logger.info(`request.query:\n${JSON.stringify(request.query, null, 2)}`);
      logger.info(`request.body:\n${JSON.stringify(request.body, null, 2)}`);
      logger.info(`Evaluation ID: ${evaluationId}`);

      const totalExecutions = connectorIds.length * agentNames.length * dataset.length;
      logger.info('Creating agents:');
      logger.info(`\tconnectors/models: ${connectorIds.length}`);
      logger.info(`\tagents: ${agentNames.length}`);
      logger.info(`\tdataset: ${dataset.length}`);
      logger.warn(`\ttotal baseline agent executions: ${totalExecutions} `);
      if (totalExecutions > 50) {
        logger.warn(
          `Total baseline agent executions >= 50! This may take a while, and cost some money...`
        );
      }

      try {
        // Get the actions plugin start contract from the request context for the agents
        const actions = (await context.elasticAssistant).actions;

        // Fetch all connectors from the actions plugin, so we can set the appropriate `llmType` on ActionsClientLlm
        const actionsClient = await actions.getActionsClientWithRequest(request);
        const connectors = await actionsClient.getBulk({
          ids: connectorIds,
          throwIfSystemAction: false,
        });

        // Get a scoped esClient for passing to the agents for retrieval, and
        // writing results to the output index
        const esClient = (await context.core).elasticsearch.client.asCurrentUser;

        // Default ELSER model
        const elserId = await getElser(request, (await context.core).savedObjects.getClient());

        // Skeleton request to satisfy `subActionParams` spread in `ActionsClientLlm`
        const skeletonRequest: KibanaRequest<unknown, unknown, RequestBody> = {
          ...request,
          body: {
            params: {
              subAction: 'invokeAI',
              subActionParams: {
                messages: [],
              },
            },
          },
        };

        // Create an array of executor functions to call in batches
        // One for each connector/model + agent combination
        // Hoist `langChainMessages` so they can be batched by dataset.input in the evaluator
        const agents: AgentExecutorEvaluator[] = [];
        connectorIds.forEach((connectorId) => {
          agentNames.forEach((agentName) => {
            logger.info(`Creating agent: ${connectorId} + ${agentName}`);
            const llmType = getLlmType(connectorId, connectors);
            agents.push((langChainMessages) =>
              AGENT_EXECUTOR_MAP[agentName]({
                actions,
                connectorId,
                esClient,
                elserId,
                langChainMessages,
                llmType,
                logger,
                request: skeletonRequest,
                kbResource: ESQL_RESOURCE,
              })
            );
          });
        });

        logger.info(`Agents created: ${agents.length}`);

        const evaluatorModel = new ActionsClientLlm({
          actions,
          connectorId: evalModel,
          request: skeletonRequest,
          logger,
        });

        const { evaluationResults, evaluationSummary } = await performEvaluation({
          agentExecutorEvaluators: agents,
          dataset,
          evaluationId,
          evaluatorModel,
          evaluationPrompt: evalPrompt,
          evaluationType,
          logger,
        });

        logger.info(`Writing evaluation results to index: ${outputIndex}`);
        await setupEvaluationIndex({ esClient, index: outputIndex, logger });
        await indexEvaluations({
          esClient,
          evaluationResults,
          evaluationSummary,
          index: outputIndex,
          logger,
        });

        return response.ok({
          body: { success: true },
        });
      } catch (err) {
        logger.error(err);
        const error = transformError(err);

        return resp.error({
          body: error.message,
          statusCode: error.statusCode,
        });
      }
    }
  );
};
