/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import type { Observable } from 'rxjs';
import fetch from 'node-fetch';
import { queue } from 'async';
// import { spawn } from 'child_process';
import { schema } from '@kbn/config-schema';
import { streamFactory } from '@kbn/aiops-utils';
// import { readFile } from 'fs/promises';
import { RouteInitialization } from '../types';
import { wrapError } from '../client/error_wrapper';
import type { MlConfigType } from '../../config';
import {
  getInferenceQuerySchema,
  modelIdSchema,
  optionalModelIdSchema,
  putTrainedModelQuerySchema,
  inferTrainedModelQuery,
  inferTrainedModelBody,
  threadingParamsSchema,
  huggingFaceImport,
  pipelineSimulateBody,
  updateDeploymentParamsSchema,
} from './schemas/inference_schema';
import { modelsProvider } from '../models/data_frame_analytics';
import { TrainedModelConfigResponse } from '../../common/types/trained_models';
import { mlLog } from '../lib/log';
import { forceQuerySchema } from './schemas/anomaly_detectors_schema';

export function trainedModelsRoutes(
  { router, routeGuard }: RouteInitialization,
  config$: Observable<MlConfigType>
) {
  /**
   * @apiGroup TrainedModels
   *
   * @api {get} /api/ml/trained_models/:modelId Get info of a trained inference model
   * @apiName GetTrainedModel
   * @apiDescription Retrieves configuration information for a trained model.
   */
  router.get(
    {
      path: '/api/ml/trained_models/{modelId?}',
      validate: {
        params: optionalModelIdSchema,
        query: getInferenceQuerySchema,
      },
      options: {
        tags: ['access:ml:canGetTrainedModels'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ client, mlClient, request, response }) => {
      try {
        const { modelId } = request.params;
        const { with_pipelines: withPipelines, ...query } = request.query;
        const body = await mlClient.getTrainedModels({
          // @ts-expect-error @elastic-elasticsearch not sure why this is an error, size is a number
          size: 1000,
          ...query,
          ...(modelId ? { model_id: modelId } : {}),
        });
        // model_type is missing
        // @ts-ignore
        const result = body.trained_model_configs as TrainedModelConfigResponse[];
        try {
          if (withPipelines) {
            const modelIdsAndAliases: string[] = Array.from(
              new Set(
                result
                  .map(({ model_id: id, metadata }) => {
                    return [id, ...(metadata?.model_aliases ?? [])];
                  })
                  .flat()
              )
            );

            const pipelinesResponse = await modelsProvider(client, mlClient).getModelsPipelines(
              modelIdsAndAliases
            );
            for (const model of result) {
              model.pipelines = {
                ...(pipelinesResponse.get(model.model_id) ?? {}),
                ...(model.metadata?.model_aliases ?? []).reduce((acc, alias) => {
                  return {
                    ...acc,
                    ...(pipelinesResponse.get(alias) ?? {}),
                  };
                }, {}),
              };
            }
          }
        } catch (e) {
          // the user might not have required permissions to fetch pipelines
          // log the error to the debug log as this might be a common situation and
          // we don't need to fill kibana's log with these messages.
          mlLog.debug(e);
        }

        return response.ok({
          body: result,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup TrainedModels
   *
   * @api {get} /api/ml/trained_models/_stats Get stats for all trained models
   * @apiName GetTrainedModelStats
   * @apiDescription Retrieves usage information for all trained models.
   */
  router.get(
    {
      path: '/api/ml/trained_models/_stats',
      validate: false,
      options: {
        tags: ['access:ml:canGetTrainedModels'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
      try {
        const body = await mlClient.getTrainedModelsStats();
        return response.ok({
          body,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup TrainedModels
   *
   * @api {get} /api/ml/trained_models/:modelId/_stats Get stats of a trained model
   * @apiName GetTrainedModelStatsById
   * @apiDescription Retrieves usage information for trained models.
   */
  router.get(
    {
      path: '/api/ml/trained_models/{modelId}/_stats',
      validate: {
        params: modelIdSchema,
      },
      options: {
        tags: ['access:ml:canGetTrainedModels'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
      try {
        const { modelId } = request.params;
        const body = await mlClient.getTrainedModelsStats({
          ...(modelId ? { model_id: modelId } : {}),
        });
        return response.ok({
          body,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup TrainedModels
   *
   * @api {get} /api/ml/trained_models/:modelId/pipelines Get trained model pipelines
   * @apiName GetTrainedModelPipelines
   * @apiDescription Retrieves pipelines associated with a trained model
   */
  router.get(
    {
      path: '/api/ml/trained_models/{modelId}/pipelines',
      validate: {
        params: modelIdSchema,
      },
      options: {
        tags: ['access:ml:canGetTrainedModels'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ client, request, mlClient, response }) => {
      try {
        const { modelId } = request.params;
        const result = await modelsProvider(client, mlClient).getModelsPipelines(
          modelId.split(',')
        );
        return response.ok({
          body: [...result].map(([id, pipelines]) => ({ model_id: id, pipelines })),
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup TrainedModels
   *
   * @api {put} /api/ml/trained_models/:modelId Put a trained model
   * @apiName PutTrainedModel
   * @apiDescription Adds a new trained model
   */
  router.put(
    {
      path: '/api/ml/trained_models/{modelId}',
      validate: {
        params: modelIdSchema,
        body: schema.any(),
        query: putTrainedModelQuerySchema,
      },
      options: {
        tags: ['access:ml:canCreateTrainedModels'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
      try {
        const { modelId } = request.params;
        const body = await mlClient.putTrainedModel({
          model_id: modelId,
          body: request.body,
          ...(request.query?.defer_definition_decompression
            ? { defer_definition_decompression: true }
            : {}),
        });
        return response.ok({
          body,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup TrainedModels
   *
   * @api {delete} /api/ml/trained_models/:modelId Delete a trained model
   * @apiName DeleteTrainedModel
   * @apiDescription Deletes an existing trained model that is currently not referenced by an ingest pipeline.
   */
  router.delete(
    {
      path: '/api/ml/trained_models/{modelId}',
      validate: {
        params: modelIdSchema,
      },
      options: {
        tags: ['access:ml:canDeleteTrainedModels'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
      try {
        const { modelId } = request.params;
        const body = await mlClient.deleteTrainedModel({
          model_id: modelId,
        });
        return response.ok({
          body,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup TrainedModels
   *
   * @api {get} /api/ml/trained_models/nodes_overview Get node overview about the models allocation
   * @apiName GetTrainedModelsNodesOverview
   * @apiDescription Retrieves the list of ML nodes with memory breakdown and allocated models info
   */
  router.get(
    {
      path: '/api/ml/trained_models/nodes_overview',
      validate: {},
      options: {
        tags: [
          'access:ml:canViewMlNodes',
          'access:ml:canGetDataFrameAnalytics',
          'access:ml:canGetJobs',
          'access:ml:canGetTrainedModels',
        ],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ client, mlClient, request, response }) => {
      try {
        const result = await modelsProvider(client, mlClient).getNodesOverview();
        return response.ok({
          body: result,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup TrainedModels
   *
   * @api {post} /api/ml/trained_models/:modelId/deployment/_start Start trained model deployment
   * @apiName StartTrainedModelDeployment
   * @apiDescription Starts trained model deployment.
   */
  router.post(
    {
      path: '/api/ml/trained_models/{modelId}/deployment/_start',
      validate: {
        params: modelIdSchema,
        query: threadingParamsSchema,
      },
      options: {
        tags: ['access:ml:canStartStopTrainedModels'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
      try {
        const { modelId } = request.params;
        const body = await mlClient.startTrainedModelDeployment({
          model_id: modelId,
          ...(request.query ? request.query : {}),
        });
        return response.ok({
          body,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup TrainedModels
   *
   * @api {post} /api/ml/trained_models/:modelId/deployment/_update Update trained model deployment
   * @apiName UpdateTrainedModelDeployment
   * @apiDescription Updates trained model deployment.
   */
  router.post(
    {
      path: '/api/ml/trained_models/{modelId}/deployment/_update',
      validate: {
        params: modelIdSchema,
        body: updateDeploymentParamsSchema,
      },
      options: {
        tags: ['access:ml:canStartStopTrainedModels'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
      try {
        const { modelId } = request.params;
        const body = await mlClient.updateTrainedModelDeployment({
          model_id: modelId,
          ...request.body,
        });
        return response.ok({
          body,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup TrainedModels
   *
   * @api {post} /api/ml/trained_models/:modelId/deployment/_stop Stop trained model deployment
   * @apiName StopTrainedModelDeployment
   * @apiDescription Stops trained model deployment.
   */
  router.post(
    {
      path: '/api/ml/trained_models/{modelId}/deployment/_stop',
      validate: {
        params: modelIdSchema,
        query: forceQuerySchema,
      },
      options: {
        tags: ['access:ml:canStartStopTrainedModels'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
      try {
        const { modelId } = request.params;
        const body = await mlClient.stopTrainedModelDeployment({
          model_id: modelId,
          force: request.query.force ?? false,
        });
        return response.ok({
          body,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup TrainedModels
   *
   * @api {post} /api/ml/trained_models/pipeline_simulate Simulates an ingest pipeline
   * @apiName SimulateIngestPipeline
   * @apiDescription Simulates an ingest pipeline.
   */
  router.post(
    {
      path: '/api/ml/trained_models/pipeline_simulate',
      validate: {
        body: pipelineSimulateBody,
      },
      options: {
        tags: ['access:ml:canTestTrainedModels'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ client, request, response }) => {
      try {
        const { pipeline, docs } = request.body;
        const body = await client.asInternalUser.ingest.simulate({
          pipeline,
          docs,
        });
        return response.ok({
          body,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup TrainedModels
   *
   * @api {post} /api/ml/trained_models/infer/:modelId Evaluates a trained model
   * @apiName InferTrainedModelDeployment
   * @apiDescription Evaluates a trained model.
   */
  router.post(
    {
      path: '/api/ml/trained_models/infer/{modelId}',
      validate: {
        params: modelIdSchema,
        query: inferTrainedModelQuery,
        body: inferTrainedModelBody,
      },
      options: {
        tags: ['access:ml:canTestTrainedModels'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
      try {
        const { modelId } = request.params;
        const body = await mlClient.inferTrainedModel({
          model_id: modelId,
          body: {
            docs: request.body.docs,
            ...(request.body.inference_config
              ? { inference_config: request.body.inference_config }
              : {}),
          },
          ...(request.query.timeout ? { timeout: request.query.timeout } : {}),
        });
        return response.ok({
          body,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup TrainedModels
   *
   * @api {post} /api/ml/trained_models/hugging_face_import Import hugging face trained model
   * @apiName InferTrainedModelDeployment
   * @apiDescription Import hugging face trained model.
  //  */
  // router.post(
  //   {
  //     path: '/api/ml/trained_models/hugging_face_import_old',
  //     validate: {
  //       body: huggingFaceImport,
  //     },
  //     options: {
  //       tags: ['access:ml:canTestTrainedModels'],
  //     },
  //   },
  //   routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
  //     try {
  //       function resetAction() {
  //         return { type: 'reset' };
  //       }

  //       const ELASTICSEARCH_URL = 'http://user:pass@localhost:9200';

  //       const { end, push, responseWithHeaders } = streamFactory<any>(
  //         request.headers,
  //         {
  //           error: (e: any) => {
  //             // eslint-disable-next-line no-console
  //             console.log(e);
  //           },
  //           debug: (e: any) => {
  //             // eslint-disable-next-line no-console
  //             console.log(e);
  //           },
  //         } as any,
  //         true
  //       );

  //       (async () => {
  //         push(resetAction());
  //         const { hubModelId, start, clearPrevious, taskType } = request.body;
  //         const importCmd = `eland_import_hub_model --url ${ELASTICSEARCH_URL} --hub-model-id ${hubModelId} --task-type ${taskType} ${
  //           start ? '--start' : ''
  //         } ${clearPrevious ? '--clear-previous' : ''}`;

  //         const cmd = `cd /Users/james/dev/eland && . venv/bin/activate && ${importCmd}`;

  //         const run = async () => {
  //           return new Promise<void>((resolve, reject) => {
  //             const child = spawn(cmd, [], { shell: true, detached: true });

  //             child.stderr.on('data', (data) => {
  //               const line: string = data.toString().replace(/\n/g, '');
  //               if (line.match(/parts\/s/)) {
  //                 const percentageMatch = line.match(/^\r\s?(.*)%/);
  //                 if (percentageMatch && percentageMatch.length > 1) {
  //                   push({
  //                     type: 'progress',
  //                     payload: { progress: Number(percentageMatch[1]) },
  //                   });
  //                 }
  //               } else {
  //                 push({
  //                   type: 'add_messages',
  //                   payload: { messages: [line] },
  //                 });
  //               }
  //             });

  //             child.on('error', (error) => {});

  //             child.on('close', (code) => {});
  //           });
  //         };

  //         await run();
  //         end();
  //       })();

  //       return response.ok(responseWithHeaders);
  //     } catch (e) {
  //       return response.customError(wrapError(e));
  //     }
  //   })
  // );

  /**
   * @apiGroup TrainedModels
   *
   * @api {post} /api/ml/trained_models/hugging_face_import Import hugging face trained model
   * @apiName InferTrainedModelDeployment
   * @apiDescription Import hugging face trained model.
   */
  router.post(
    {
      path: '/api/ml/trained_models/hugging_face_import',
      validate: {
        body: huggingFaceImport,
      },
      options: {
        tags: ['access:ml:canTestTrainedModels'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ client, mlClient, request, response }) => {
      const { hubModelId, start } = request.body;

      const configSubject$ = new BehaviorSubject<MlConfigType>({});
      config$.subscribe(configSubject$);
      const { trainedModelsServer } = configSubject$.getValue();
      if (trainedModelsServer === undefined || trainedModelsServer.url === undefined) {
        throw new Error('No server configured');
      }

      try {
        function resetAction() {
          return { type: 'reset' };
        }

        // const MODEL_SERVER_URL = 'http://localhost:3213/catalog/models/';
        const { username, password, url: modelServerUrl } = trainedModelsServer;
        const MODEL_SERVER_URL = `${modelServerUrl}/catalog/models/`;

        const AUTH_HEADER = {
          Authorization:
            'Basic ' + Buffer.from(`${username}:${password}`, 'binary').toString('base64'),
        };

        const MAX_CONCURRENT_QUERIES = 5;

        const { end, push, responseWithHeaders } = streamFactory<any>(
          request.headers,
          {
            error: (e: any) => {
              // eslint-disable-next-line no-console
              console.log(e);
            },
            debug: (e: any) => {
              // console.log(e);
            },
          } as any,
          true
        );

        const getMetaData = async (modelId: string) => {
          const resp = await fetch(`${MODEL_SERVER_URL}${modelId}`, {
            method: 'GET',
            headers: { ...AUTH_HEADER },
          });
          return resp.json();
        };

        const getConfig = async (modelId: string) => {
          const url = `${MODEL_SERVER_URL}${modelId}/config`;
          const resp = await fetch(url, {
            method: 'GET',
            headers: { ...AUTH_HEADER },
          });
          return resp.json();
        };

        const putConfig = async (id: string, config: string) => {
          return client.asInternalUser.transport.request({
            method: 'PUT',
            path: `/_ml/trained_models/${id}`,
            body: config,
          });
        };

        const putModelPart = async (
          id: string,
          partNumber: number,
          totalParts: number,
          totalLength: number,
          definition: string
        ) => {
          return client.asInternalUser.transport.request(
            {
              method: 'PUT',
              path: `/_ml/trained_models/${id}/definition/${partNumber}`,
              body: {
                definition,
                total_definition_length: totalLength,
                total_parts: totalParts,
              },
            },
            { maxRetries: 0 }
          );
        };

        const getVocabulary = async (modelId: string) => {
          const url = `${MODEL_SERVER_URL}${modelId}/vocabulary`;

          const resp = await fetch(url, {
            method: 'GET',
            headers: { ...AUTH_HEADER },
          });
          return resp.json();
        };

        const putVocabulary = async (id: string, config: string) => {
          return client.asInternalUser.transport.request({
            method: 'PUT',
            path: `/_ml/trained_models/${id}/vocabulary`,
            body: config,
          });
        };

        const getDefinitionPart = async (modelId: string, part: number) => {
          const resp = await fetch(`${MODEL_SERVER_URL}${modelId}/definition/part/${part}`, {
            method: 'GET',
            headers: { ...AUTH_HEADER },
          });
          return resp.buffer();
        };

        (async () => {
          push(resetAction());

          const modelId = hubModelId;

          const run = async () => {
            try {
              const meta = await getMetaData(modelId);
              const definitionSize: number = meta.source.total_definition_length;
              const definitionParts: number = meta.source.total_parts;

              const config = await getConfig(modelId);

              push({
                type: 'get_config',
              });

              const vocab = await getVocabulary(modelId);

              push({
                type: 'get_vocabulary',
              });

              await putConfig(modelId, config);
              push({
                type: 'put_config',
              });

              await putVocabulary(modelId, vocab);
              push({
                type: 'put_vocabulary',
              });

              let completedParts = 0;
              const requestQueue = queue(async function (partNo: number) {
                const content = await getDefinitionPart(modelId, partNo);
                const b64 = content.toString('base64');

                await putModelPart(modelId, partNo, definitionParts, definitionSize, b64);
                const progress = Number(completedParts / (definitionParts - 1)) * 100;
                completedParts++;
                push({
                  type: 'put_definition_part',
                  payload: { progress },
                });
              }, MAX_CONCURRENT_QUERIES);

              requestQueue.push(Array.from(Array(definitionParts).keys()));
              await requestQueue.drain();
              push({
                type: 'complete',
              });
            } catch (error) {
              push({ error });
            }
          };

          await run();
          end();
        })();

        return response.ok(responseWithHeaders);
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup TrainedModels
   *
   * @api {post} /api/ml/trained_models/pipeline_simulate Simulates an ingest pipeline
   * @apiName SimulateIngestPipeline
   * @apiDescription Simulates an ingest pipeline.
   */
  router.get(
    {
      path: '/api/ml/trained_models/hugging_face_model_list',
      validate: false,
      options: {
        tags: ['access:ml:canTestTrainedModels'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ client, request, response }) => {
      try {
        const configSubject$ = new BehaviorSubject<MlConfigType>({});
        config$.subscribe(configSubject$);
        const { trainedModelsServer } = configSubject$.getValue();
        if (trainedModelsServer === undefined || trainedModelsServer.url === undefined) {
          throw new Error('No server configured');
        }

        const { username, password, url: modelServerUrl } = trainedModelsServer;
        const MODEL_SERVER_URL = `${modelServerUrl}/catalog/models/`;
        // const MODEL_SERVER_URL = 'http://localhost:3213/catalog/models/';
        // const MODEL_SERVER_URL = 'https://mml.ml-qa.com/catalog/models/';

        // const username = 'ml-dev';
        // const password = '60Xl4wyIPAsMTXD5Vve7FRszSplQg0RzrCCCjg8eews=';

        const AUTH_HEADER = {
          Authorization:
            'Basic ' + Buffer.from(`${username}:${password}`, 'binary').toString('base64'),
        };

        const resp = await fetch(MODEL_SERVER_URL, {
          method: 'GET',
          headers: {
            ...AUTH_HEADER,
          },
        });

        return response.ok({
          body: await resp.json(),
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );
}
