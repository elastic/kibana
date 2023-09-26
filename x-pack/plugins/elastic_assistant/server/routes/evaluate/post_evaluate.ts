/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter, Logger } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';

import { buildResponse } from '../../lib/build_response';
import { buildRouteValidation } from '../../schemas/common';

import { ElasticAssistantRequestHandlerContext } from '../../types';
import { EVALUATE } from '../../../common/constants';
import { PostEvaluateBody, PostEvaluatePathQuery } from '../../schemas/evaluate/post_evaluate';
import { performEvaluation } from '../../lib/model_evaluator/evaluation';
import { callAgentExecutor } from '../../lib/langchain/execute_custom_llm_chain';
import { callOpenAIFunctionsExecutor } from '../../lib/langchain/executors/openai_functions_executor';
import { AgentExecutor, AgentExecutorEvaluator } from '../../lib/langchain/executors/types';
import { ActionsClientLlm } from '../../lib/langchain/llm/actions_client_llm';

const AGENT_EXECUTOR_MAP: Record<string, AgentExecutor> = {
  DefaultAgentExecutor: callAgentExecutor,
  OpenAIFunctionsExecutor: callOpenAIFunctionsExecutor,
};

export const postEvaluateRoute = (router: IRouter<ElasticAssistantRequestHandlerContext>) => {
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

      logger.info('postEvaluateRoute:');
      logger.info(`request.query:\n${JSON.stringify(request.query, null, 2)}`);
      logger.info(`request.body:\n${JSON.stringify(request.body, null, 2)}`);

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

        // Get a scoped esClient for passing to the agents for retrieval, and
        // writing results to the output index
        const esClient = (await context.core).elasticsearch.client.asCurrentUser;

        // Skeleton request to satisfy `subActionParams` spread in `ActionsClientLlm`
        const skeletonRequest = {
          ...request,
          body: {
            params: {
              subAction: 'test',
              subActionParams: {},
            },
          },
        };

        // Create an array of executor functions to call in batches
        // One for each connector/model + agent combination
        // Hoist `langChainMessages` so they can be batched by dataset.input in the evaluator
        const agents: AgentExecutorEvaluator[] = [];
        connectorIds.forEach((connectorId) => {
          agentNames.forEach((agentName) => {
            agents.push((langChainMessages) =>
              AGENT_EXECUTOR_MAP[agentName]({
                actions,
                connectorId,
                esClient,
                langChainMessages,
                logger,
                request: skeletonRequest,
              })
            );
            logger.info(`Creating agent: ${connectorId} + ${agentName}`);
          });
        });

        logger.info(`Agents created: ${agents.length}`);

        const evaluatorModel = new ActionsClientLlm({
          actions,
          connectorId: evalModel,
          request: skeletonRequest,
          logger,
        });

        const evalResponse = await performEvaluation({
          agentExecutorEvaluators: agents,
          dataset,
          evaluatorModel,
          evaluationPrompt: evalPrompt,
          evaluationType,
          logger,
        });

        logger.info('evalResponse: ');
        logger.info(JSON.stringify(evalResponse, null, 2));

        // TODO: Create a new index for the evaluation results
        // TODO: Write the evaluation results to the index

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
