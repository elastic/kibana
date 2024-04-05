/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type IKibanaResponse, IRouter, KibanaRequest } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { v4 as uuidv4 } from 'uuid';

import {
  API_VERSIONS,
  INTERNAL_API_ACCESS,
  PostEvaluateBody,
  PostEvaluateRequestQuery,
  PostEvaluateResponse,
  ExecuteConnectorRequestBody,
} from '@kbn/elastic-assistant-common';
import { buildRouteValidationWithZod } from '@kbn/elastic-assistant-common/impl/schemas/common';
import { ESQL_RESOURCE } from '../knowledge_base/constants';
import { buildResponse } from '../../lib/build_response';
import { ElasticAssistantRequestHandlerContext, GetElser } from '../../types';
import { EVALUATE } from '../../../common/constants';
import { performEvaluation } from '../../lib/model_evaluator/evaluation';
import { AgentExecutorEvaluatorWithMetadata } from '../../lib/langchain/executors/types';
import { ActionsClientLlm } from '../../lib/langchain/llm/actions_client_llm';
import {
  indexEvaluations,
  setupEvaluationIndex,
} from '../../lib/model_evaluator/output_index/utils';
import { fetchLangSmithDataset, getConnectorName, getLangSmithTracer } from './utils';
import { DEFAULT_PLUGIN_NAME, getPluginNameFromRequest } from '../helpers';

/**
 * To support additional Agent Executors from the UI, add them to this map
 * and reference your specific AgentExecutor function
 */
import { AGENT_EXECUTOR_MAP } from '../../lib/langchain/executors';

const DEFAULT_SIZE = 20;

export const postEvaluateRoute = (
  router: IRouter<ElasticAssistantRequestHandlerContext>,
  getElser: GetElser
) => {
  router.versioned
    .post({
      access: INTERNAL_API_ACCESS,
      path: EVALUATE,

      options: {
        tags: ['access:elasticAssistant'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            body: buildRouteValidationWithZod(PostEvaluateBody),
            query: buildRouteValidationWithZod(PostEvaluateRequestQuery),
          },
          response: {
            200: {
              body: buildRouteValidationWithZod(PostEvaluateResponse),
            },
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<PostEvaluateResponse>> => {
        const assistantContext = await context.elasticAssistant;
        const logger = assistantContext.logger;
        const telemetry = assistantContext.telemetry;

        // Validate evaluation feature is enabled
        const pluginName = getPluginNameFromRequest({
          request,
          defaultPluginName: DEFAULT_PLUGIN_NAME,
          logger,
        });
        const registeredFeatures = assistantContext.getRegisteredFeatures(pluginName);
        if (!registeredFeatures.assistantModelEvaluation) {
          return response.notFound();
        }

        try {
          const evaluationId = uuidv4();
          const {
            evalModel,
            evaluationType,
            outputIndex,
            datasetName,
            projectName = 'default',
            runName = evaluationId,
          } = request.query;
          const { dataset: customDataset = [], evalPrompt } = request.body;
          const connectorIds = request.query.models?.split(',') || [];
          const agentNames = request.query.agents?.split(',') || [];

          const dataset =
            datasetName != null ? await fetchLangSmithDataset(datasetName, logger) : customDataset;

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

          // Get the actions plugin start contract from the request context for the agents
          const actions = (await context.elasticAssistant).actions;

          // Fetch all connectors from the actions plugin, so we can set the appropriate `llmType` on ActionsClientLlm
          const actionsClient = await actions.getActionsClientWithRequest(request);
          const connectors = await actionsClient.getBulk({
            ids: connectorIds,
            throwIfSystemAction: false,
          });

          // Fetch any tools registered by the request's originating plugin
          const assistantTools = (await context.elasticAssistant).getRegisteredTools(pluginName);

          // Get a scoped esClient for passing to the agents for retrieval, and
          // writing results to the output index
          const esClient = (await context.core).elasticsearch.client.asCurrentUser;

          // Default ELSER model
          const elserId = await getElser(request, (await context.core).savedObjects.getClient());

          // Skeleton request from route to pass to the agents
          // params will be passed to the actions executor
          const skeletonRequest: KibanaRequest<unknown, unknown, ExecuteConnectorRequestBody> = {
            ...request,
            body: {
              alertsIndexPattern: '',
              allow: [],
              allowReplacement: [],
              subAction: 'invokeAI',
              // The actionTypeId is irrelevant when used with the invokeAI subaction
              actionTypeId: '.gen-ai',
              replacements: {},
              size: DEFAULT_SIZE,
              isEnabledKnowledgeBase: true,
              isEnabledRAGAlerts: true,
              conversationId: '',
            },
          };

          // Create an array of executor functions to call in batches
          // One for each connector/model + agent combination
          // Hoist `langChainMessages` so they can be batched by dataset.input in the evaluator
          const agents: AgentExecutorEvaluatorWithMetadata[] = [];
          connectorIds.forEach((connectorId) => {
            agentNames.forEach((agentName) => {
              logger.info(`Creating agent: ${connectorId} + ${agentName}`);
              const connectorName =
                getConnectorName(connectorId, connectors) ?? '[unknown connector]';
              const detailedRunName = `${runName} - ${connectorName} + ${agentName}`;
              agents.push({
                agentEvaluator: async (langChainMessages, exampleId) => {
                  const evalResult = await AGENT_EXECUTOR_MAP[agentName]({
                    actions,
                    isEnabledKnowledgeBase: true,
                    assistantTools,
                    connectorId,
                    esClient,
                    elserId,
                    isStream: false,
                    langChainMessages,
                    llmType: 'openai',
                    logger,
                    request: skeletonRequest,
                    kbResource: ESQL_RESOURCE,
                    telemetry,
                    traceOptions: {
                      exampleId,
                      projectName,
                      runName: detailedRunName,
                      evaluationId,
                      tags: [
                        'security-assistant-prediction',
                        ...(connectorName != null ? [connectorName] : []),
                        runName,
                      ],
                      tracers: getLangSmithTracer({
                        projectName: detailedRunName,
                        exampleId,
                        logger,
                      }),
                    },
                    replacements: {},
                  });
                  return evalResult.body;
                },
                metadata: {
                  connectorName,
                  runName: detailedRunName,
                },
              });
            });
          });
          logger.info(`Agents created: ${agents.length}`);

          // Evaluator Model is optional to support just running predictions
          const evaluatorModel =
            evalModel == null || evalModel === ''
              ? undefined
              : new ActionsClientLlm({
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
            runName,
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
            body: { evaluationId, success: true },
          });
        } catch (err) {
          logger.error(err);
          const error = transformError(err);

          const resp = buildResponse(response);
          return resp.error({
            body: { success: false, error: error.message },
            statusCode: error.statusCode,
          });
        }
      }
    );
};
