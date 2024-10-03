/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter, KibanaRequest, type IKibanaResponse } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { asyncForEach } from '@kbn/std';
import { Client } from 'langsmith';
import { evaluate } from 'langsmith/evaluation';
import { v4 as uuidv4 } from 'uuid';

import { getRequestAbortedSignal } from '@kbn/data-plugin/server';
import {
  API_VERSIONS,
  ELASTIC_AI_ASSISTANT_EVALUATE_URL,
  ExecuteConnectorRequestBody,
  INTERNAL_API_ACCESS,
  PostEvaluateBody,
  PostEvaluateResponse,
} from '@kbn/elastic-assistant-common';
import { buildRouteValidationWithZod } from '@kbn/elastic-assistant-common/impl/schemas/common';
import { getDefaultArguments } from '@kbn/langchain/server';
import { StructuredTool } from '@langchain/core/tools';
import {
  createOpenAIFunctionsAgent,
  createStructuredChatAgent,
  createToolCallingAgent,
} from 'langchain/agents';
import { RetrievalQAChain } from 'langchain/chains';
import { buildResponse } from '../../lib/build_response';
import { AssistantDataClients } from '../../lib/langchain/executors/types';
import { AssistantToolParams, ElasticAssistantRequestHandlerContext, GetElser } from '../../types';
import { DEFAULT_PLUGIN_NAME, isV2KnowledgeBaseEnabled, performChecks } from '../helpers';
import { ESQL_RESOURCE } from '../knowledge_base/constants';
import { fetchLangSmithDataset } from './utils';
import { transformESSearchToAnonymizationFields } from '../../ai_assistant_data_clients/anonymization_fields/helpers';
import { EsAnonymizationFieldsSchema } from '../../ai_assistant_data_clients/anonymization_fields/types';
import { ElasticsearchStore } from '../../lib/langchain/elasticsearch_store/elasticsearch_store';
import {
  DefaultAssistantGraph,
  getDefaultAssistantGraph,
} from '../../lib/langchain/graphs/default_assistant_graph/graph';
import {
  bedrockToolCallingAgentPrompt,
  geminiToolCallingAgentPrompt,
  openAIFunctionAgentPrompt,
  structuredChatAgentPrompt,
} from '../../lib/langchain/graphs/default_assistant_graph/prompts';
import { getLlmClass, getLlmType } from '../utils';

const DEFAULT_SIZE = 20;
const ROUTE_HANDLER_TIMEOUT = 10 * 60 * 1000; // 10 * 60 seconds = 10 minutes

export const postEvaluateRoute = (
  router: IRouter<ElasticAssistantRequestHandlerContext>,
  getElser: GetElser
) => {
  router.versioned
    .post({
      access: INTERNAL_API_ACCESS,
      path: ELASTIC_AI_ASSISTANT_EVALUATE_URL,
      options: {
        tags: ['access:elasticAssistant'],
        timeout: {
          idleSocket: ROUTE_HANDLER_TIMEOUT,
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            body: buildRouteValidationWithZod(PostEvaluateBody),
          },
          response: {
            200: {
              body: { custom: buildRouteValidationWithZod(PostEvaluateResponse) },
            },
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<PostEvaluateResponse>> => {
        const ctx = await context.resolve(['core', 'elasticAssistant', 'licensing']);
        const assistantContext = ctx.elasticAssistant;
        const actions = ctx.elasticAssistant.actions;
        const logger = assistantContext.logger.get('evaluate');
        const telemetry = assistantContext.telemetry;
        const abortSignal = getRequestAbortedSignal(request.events.aborted$);
        const v2KnowledgeBaseEnabled = isV2KnowledgeBaseEnabled({ context: ctx, request });

        // Perform license, authenticated user and evaluation FF checks
        const checkResponse = performChecks({
          authenticatedUser: true,
          capability: 'assistantModelEvaluation',
          context: ctx,
          license: true,
          request,
          response,
        });
        if (checkResponse) {
          return checkResponse;
        }

        try {
          const evaluationId = uuidv4();
          const {
            alertsIndexPattern,
            datasetName,
            graphs: graphNames,
            langSmithApiKey,
            connectorIds,
            size,
            replacements,
            runName = evaluationId,
          } = request.body;

          const dataset = await fetchLangSmithDataset(datasetName, logger, langSmithApiKey);

          if (dataset.length === 0) {
            return response.badRequest({
              body: { message: `No LangSmith dataset found for name: ${datasetName}` },
            });
          }

          logger.info('postEvaluateRoute:');
          logger.info(`request.query:\n${JSON.stringify(request.query, null, 2)}`);
          logger.info(`request.body:\n${JSON.stringify(request.body, null, 2)}`);
          logger.info(`Evaluation ID: ${evaluationId}`);

          const totalExecutions = connectorIds.length * graphNames.length * dataset.length;
          logger.info('Creating graphs:');
          logger.info(`\tconnectors/models: ${connectorIds.length}`);
          logger.info(`\tgraphs: ${graphNames.length}`);
          logger.info(`\tdataset: ${dataset.length}`);
          logger.warn(`\ttotal graph executions: ${totalExecutions} `);
          if (totalExecutions > 50) {
            logger.warn(
              `Total baseline graph executions >= 50! This may take a while, and cost some money...`
            );
          }

          // Setup graph params
          // Get a scoped esClient for esStore + writing results to the output index
          const esClient = ctx.core.elasticsearch.client.asCurrentUser;

          // Default ELSER model
          const elserId = await getElser();

          const inference = ctx.elasticAssistant.inference;

          // Data clients
          const anonymizationFieldsDataClient =
            (await assistantContext.getAIAssistantAnonymizationFieldsDataClient()) ?? undefined;
          const conversationsDataClient =
            (await assistantContext.getAIAssistantConversationsDataClient()) ?? undefined;
          const kbDataClient =
            (await assistantContext.getAIAssistantKnowledgeBaseDataClient({
              v2KnowledgeBaseEnabled,
            })) ?? undefined;
          const dataClients: AssistantDataClients = {
            anonymizationFieldsDataClient,
            conversationsDataClient,
            kbDataClient,
          };

          // esStore
          const esStore = new ElasticsearchStore(
            esClient,
            kbDataClient?.indexTemplateAndPattern?.alias ?? '',
            logger,
            telemetry,
            elserId,
            ESQL_RESOURCE,
            kbDataClient
          );

          // Actions
          const actionsClient = await actions.getActionsClientWithRequest(request);
          const connectors = await actionsClient.getBulk({
            ids: connectorIds,
            throwIfSystemAction: false,
          });

          // Fetch any tools registered to the security assistant
          const assistantTools = assistantContext.getRegisteredTools(DEFAULT_PLUGIN_NAME);

          const graphs: Array<{
            name: string;
            graph: DefaultAssistantGraph;
            llmType: string | undefined;
          }> = await Promise.all(
            connectors.map(async (connector) => {
              const llmType = getLlmType(connector.actionTypeId);
              const isOpenAI = llmType === 'openai';
              const llmClass = getLlmClass(llmType, true);
              const createLlmInstance = () =>
                new llmClass({
                  actionsClient,
                  connectorId: connector.id,
                  llmType,
                  logger,
                  temperature: getDefaultArguments(llmType).temperature,
                  signal: abortSignal,
                  streaming: false,
                  maxRetries: 0,
                });
              const llm = createLlmInstance();
              const anonymizationFieldsRes =
                await dataClients?.anonymizationFieldsDataClient?.findDocuments<EsAnonymizationFieldsSchema>(
                  {
                    perPage: 1000,
                    page: 1,
                  }
                );

              const anonymizationFields = anonymizationFieldsRes
                ? transformESSearchToAnonymizationFields(anonymizationFieldsRes.data)
                : undefined;

              // Create a chain that uses the ELSER backed ElasticsearchStore, override k=10 for esql query generation for now
              const chain = RetrievalQAChain.fromLLM(llm, esStore.asRetriever(10));

              // Check if KB is available
              const isEnabledKnowledgeBase =
                (await dataClients.kbDataClient?.isModelDeployed()) ?? false;

              // Skeleton request from route to pass to the agents
              // params will be passed to the actions executor
              const skeletonRequest: KibanaRequest<unknown, unknown, ExecuteConnectorRequestBody> =
                {
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
                    conversationId: '',
                  },
                };

              // Fetch any applicable tools that the source plugin may have registered
              const assistantToolParams: AssistantToolParams = {
                anonymizationFields,
                chain,
                esClient,
                isEnabledKnowledgeBase,
                kbDataClient: dataClients?.kbDataClient,
                llm,
                logger,
                modelExists: isEnabledKnowledgeBase,
                request: skeletonRequest,
                alertsIndexPattern,
                // onNewReplacements,
                replacements,
                inference,
                connectorId: connector.id,
                size,
              };

              const tools: StructuredTool[] = assistantTools.flatMap(
                (tool) => tool.getTool(assistantToolParams) ?? []
              );

              const agentRunnable = isOpenAI
                ? await createOpenAIFunctionsAgent({
                    llm,
                    tools,
                    prompt: openAIFunctionAgentPrompt,
                    streamRunnable: false,
                  })
                : llmType && ['bedrock', 'gemini'].includes(llmType)
                ? createToolCallingAgent({
                    llm,
                    tools,
                    prompt:
                      llmType === 'bedrock'
                        ? bedrockToolCallingAgentPrompt
                        : geminiToolCallingAgentPrompt,
                    streamRunnable: false,
                  })
                : await createStructuredChatAgent({
                    llm,
                    tools,
                    prompt: structuredChatAgentPrompt,
                    streamRunnable: false,
                  });

              return {
                name: `${runName} - ${connector.name}`,
                llmType,
                graph: getDefaultAssistantGraph({
                  agentRunnable,
                  dataClients,
                  createLlmInstance,
                  logger,
                  tools,
                  replacements: {},
                }),
              };
            })
          );

          // Run an evaluation for each graph so they show up separately (resulting in each dataset run grouped by connector)
          await asyncForEach(graphs, async ({ name, graph, llmType }) => {
            // Wrapper function for invoking the graph (to parse different input/output formats)
            const predict = async (input: { input: string }) => {
              logger.debug(`input:\n ${JSON.stringify(input, null, 2)}`);

              const r = await graph.invoke(
                {
                  input: input.input,
                  conversationId: undefined,
                  responseLanguage: 'English',
                  llmType,
                  bedrockChatEnabled: true,
                  isStreaming: false,
                }, // TODO: Update to use the correct input format per dataset type
                {
                  runName,
                  tags: ['evaluation'],
                }
              );
              const output = r.agentOutcome.returnValues.output;
              return output;
            };

            const evalOutput = await evaluate(predict, {
              data: datasetName ?? '',
              evaluators: [], // Evals to be managed in LangSmith for now
              experimentPrefix: name,
              client: new Client({ apiKey: langSmithApiKey }),
              // prevent rate limiting and unexpected multiple experiment runs
              maxConcurrency: 5,
            });
            logger.debug(`runResp:\n ${JSON.stringify(evalOutput, null, 2)}`);
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
