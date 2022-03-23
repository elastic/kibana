/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { resolve as dnsResolve } from 'dns';
// import { parse as urlParse } from 'url';
import { parseDomain, ParseResultListed } from 'parse-domain';

import { schema } from '@kbn/config-schema';
import { RouteInitialization } from '../types';
import { wrapError } from '../client/error_wrapper';
import {
  getInferenceQuerySchema,
  modelIdSchema,
  optionalModelIdSchema,
  putTrainedModelQuerySchema,
  pipelineSchema,
} from './schemas/inference_schema';
import { modelsProvider } from '../models/data_frame_analytics';
import { TrainedModelConfigResponse } from '../../common/types/trained_models';
import { mlLog } from '../lib/log';
import { forceQuerySchema } from './schemas/anomaly_detectors_schema';

async function getResponseCode(domain: string) {
  return new Promise((resolve, reject) => {
    dnsResolve(domain, (error: any, addresses: any) => {
      if (error?.code === 'ENOTFOUND') {
        resolve('NXDOMAIN');
      } else {
        resolve('NOERROR');
      }
    });
  });
}

export function trainedModelsRoutes({ router, routeGuard }: RouteInitialization) {
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
   * @api {post} /api/ml/trained_models/:modelId/deployment/_stop Stop trained model deployment
   * @apiName StopTrainedModelDeployment
   * @apiDescription Stops trained model deployment.
   */
  router.post(
    {
      path: '/api/ml/trained_models/infer/{modelId}',
      validate: {
        params: modelIdSchema,
        body: schema.object({
          docs: schema.any(),
          timeout: schema.maybe(schema.number()),
        }),
      },
      options: {
        tags: ['access:ml:canStartStopTrainedModels'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
      try {
        const { modelId } = request.params;
        const body = await mlClient.inferTrainedModelDeployment({
          model_id: modelId,
          docs: request.body.docs,
          ...(request.body.timeout ? { timeout: request.body.timeout } : {}),
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
      path: '/api/ml/trained_models/ingest_pipeline_simulate',
      validate: {
        body: pipelineSchema,
      },
      options: {
        tags: ['access:ml:canStartStopTrainedModels'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ client, request, response }) => {
      try {
        const { pipeline, docs, verbose } = request.body;

        const body = await client.asCurrentUser.ingest.simulate({
          verbose,
          body: {
            pipeline,
            docs: docs as estypes.IngestSimulateDocument[],
          },
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
      path: '/api/ml/trained_models/dga_infer',
      validate: {
        body: schema.object({
          /** Query to match documents in the index. */
          modelId: schema.string(),
          domains: schema.arrayOf(schema.string()),
        }),
      },
      options: {
        tags: ['access:ml:canStartStopTrainedModels'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ client, request, response }) => {
      const { modelId, domains } = request.body;

      try {
        const results: Record<string, any> = {};
        for (const domain of domains) {
          const parseResult = parseDomain(domain) as ParseResultListed;
          // console.log(parseResult);

          if (parseResult.type !== 'LISTED') {
            results[domain] = { error: 'Unknown domain' };
            continue;
          }

          const name = parseResult.hostname;
          const topLevelDomain = parseResult.topLevelDomains.join('.');
          const subdomain = parseResult.subDomains.join('.');
          const registeredDomain = `${parseResult.domain}.${topLevelDomain}`;

          const responseCode = await getResponseCode(name);
          // // @ts-expect-error
          // const body = await client.asCurrentUser.ingest.simulate(
          //   {
          //     body: {
          //       pipeline: {
          //         processors: [
          //           {
          //             script: {
          //               description: 'Add ngram features for ML DGA model',
          //               lang: 'painless',
          //               source:
          //                 "String nGramAtPosition(String text, int fieldcount, int n){\n  if (fieldcount+n>=text.length()){\n    return null;\n  }\n  else\n  {\n    return text.substring(fieldcount, fieldcount+n);\n  }\n}\n\nString[] secondLevelDomain(Map dynamic_domains, String domain, String subdomain, String registered_domain, String top_level_domain){\n  if (registered_domain == null || registered_domain == '.') {\n    return new String[] {domain, ''};\n  }\n\n  if (dynamic_domains.containsKey(registered_domain) == true) {\n    if (subdomain != null) {\n      return new String[] {subdomain, registered_domain};\n    }\n  }\n\n  return new String[] {registered_domain.substring(0, registered_domain.length()-top_level_domain.length()-1), top_level_domain};\n  }\n\nString domain = ctx['dns']['question']['name'];\nString subdomain = ctx['dns']['question']['subdomain'];\nString registered_domain = ctx['dns']['question']['registered_domain'];\nString top_level_domain = ctx['dns']['question']['top_level_domain'];\n\nString[] ret = secondLevelDomain(params.dynamic_domains, domain, subdomain, registered_domain, top_level_domain);\n\nString sld = ret[0];\nString tld = ret[1];\n\nctx['f'] = new HashMap();\nctx['f']['tld'] = tld;\n\nfor (int i=0;i<sld.length();i++){\n  String field = nGramAtPosition(sld, i, 1);\n  if (field == null) {\n    break;\n  }\n  ctx['f']['u'+ Integer.toString(i)] = field;\n}\n\nfor (int i=0;i<sld.length();i++){\n  String field = nGramAtPosition(sld, i, 2);\n  if (field == null) {\n    break;\n  }\n  ctx['f']['b'+ Integer.toString(i)] = field;\n  }\n\nfor (int i=0;i<sld.length();i++){\n  String field = nGramAtPosition(sld, i, 3);\n  if (field == null) {\n    break;\n  }\n  ctx['f']['t'+ Integer.toString(i)] = field;\n}\n",
          //               params: {
          //                 dynamic_domains: {
          //                   'avsvmcloud.com': 0,
          //                   'co.cc': 0,
          //                   'cz.cc': 0,
          //                   'ddns.net': 0,
          //                   'dyndns.org': 0,
          //                   'dynserv.com': 0,
          //                   'github.io': 0,
          //                   'mooo.com': 0,
          //                   'mynumber.org': 0,
          //                   'yi.org': 0,
          //                 },
          //               },
          //             },
          //           },
          //           {
          //             inference: {
          //               field_map: {},
          //               inference_config: {
          //                 classification: {
          //                   num_top_classes: 1,
          //                 },
          //               },
          //               model_id: 'dga_1611725_2.0',
          //               target_field: 'ml_is_dga',
          //             },
          //           },
          //           {
          //             script: {
          //               lang: 'painless',
          //               source:
          //                 "def top_classes = ctx['ml_is_dga']['top_classes'];\ndef malicious_probability = 0.0;\ndef malicious_prediction = ctx['ml_is_dga']['malicious_prediction'];\n\nfor (def class: top_classes) {\n  if (class['class_name'] == 1) {\n    malicious_probability = class['class_probability'];\n  }\n}\n\nctx.remove('ml_is_dga');\nctx.remove('f');\nctx['ml_is_dga'] = new HashMap();\nctx['ml_is_dga']['malicious_prediction'] = malicious_prediction;\nctx['ml_is_dga']['malicious_probability'] = malicious_probability;\n",
          //             },
          //           },
          //         ],
          //       },
          //       docs: [
          //         {
          //           _source: {
          //             dns: {
          //               question: {
          //                 registered_domain: registeredDomain,
          //                 top_level_domain: topLevelDomain,
          //                 name,
          //                 subdomain,
          //               },
          //               response_code: responseCode,
          //             },
          //           },
          //         },
          //       ],
          //     },
          //   },
          //   { requestTimeout: '30m', maxRetries: 0 }
          // );

          const body = await client.asCurrentUser.ingest.simulate(
            {
              id: 'ml_dga_inference_pipeline',
              body: {
                docs: [
                  {
                    _source: {
                      dns: {
                        question: {
                          registered_domain: registeredDomain,
                          top_level_domain: topLevelDomain,
                          name,
                          subdomain,
                        },
                        response_code: responseCode,
                      },
                    },
                  },
                ],
              },
            },
            { requestTimeout: '30m', maxRetries: 0 }
          );
          const { docs } = body;
          if (docs.length) {
            results[domain] = docs[0].doc?._source;
          }
        }

        return response.ok({ body: results });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );
}
