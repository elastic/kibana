/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { mapValues } from 'lodash';
import { schema } from '@kbn/config-schema';
import { kqlQuery } from '@kbn/observability-plugin/server';
import { registerServerRoutes } from './routes/register_routes';
import { InventoryRouteHandlerResources } from './routes/types';
import type {
  ConfigSchema,
  InventoryServerSetup,
  InventoryServerStart,
  InventorySetupDependencies,
  InventoryStartDependencies,
} from './types';

export class InventoryPlugin
  implements
    Plugin<
      InventoryServerSetup,
      InventoryServerStart,
      InventorySetupDependencies,
      InventoryStartDependencies
    >
{
  logger: Logger;

  constructor(context: PluginInitializerContext<ConfigSchema>) {
    this.logger = context.logger.get();
  }
  setup(
    coreSetup: CoreSetup<InventoryStartDependencies, InventoryServerStart>,
    pluginsSetup: InventorySetupDependencies
  ): InventoryServerSetup {
    const startServicesPromise = coreSetup
      .getStartServices()
      .then(([_coreStart, pluginsStart]) => pluginsStart);

    registerServerRoutes({
      core: coreSetup,
      logger: this.logger,
      dependencies: {
        plugins: mapValues(pluginsSetup, (value, key) => {
          return {
            start: () =>
              startServicesPromise.then(
                (startServices) => startServices[key as keyof typeof startServices]
              ),
            setup: () => value,
          };
        }) as unknown as InventoryRouteHandlerResources['plugins'],
      },
    });
    const router = coreSetup.http.createRouter();
    router.post(
      {
        path: '/api/apply_change/plan',
        validate: {
          body: schema.object({}, { unknowns: 'allow' }),
        },
      },
      async (context, request, response) => {
        const datastream = request.body.datastream;
        let affectedDatastreams: string[] = [datastream];
        const change = request.body.change;
        const esClient = (await context.core).elasticsearch.client.asCurrentUser;
        const templates = await esClient.transport.request({
          method: 'GET',
          path: '/_index_template',
        });
        let matchingTemplate = null;
        try {
          const allMatchingTemplates = templates.index_templates
            .filter((template) => {
              const patterns: string[] = template.index_template.index_patterns;
              const matches = patterns.some((pattern) => {
                const patternToRegex = pattern.replace(/\./g, '\\.').replace(/\*/g, '.*');
                return new RegExp(patternToRegex).test(datastream);
              });
              return matches;
            })
            .sort((a, b) => {
              // sort by the priority key (highest priority first)
              return b.index_template.priority - a.index_template.priority;
            });
          matchingTemplate = allMatchingTemplates[0];
        } catch (e) {
          return response.customError({ statusCode: 500, body: e });
        }
        if (!matchingTemplate) {
          return response.customError({
            statusCode: 404,
            body: `No matching template found for datastream ${datastream}`,
          });
        } else {
          // check which existing data streams match the matchingTemplate
          const allDataStreams = await esClient.transport.request({
            method: 'GET',
            path: '/_data_stream',
          });
          affectedDatastreams = allDataStreams.data_streams
            .filter((dataStream) => {
              return dataStream.template === matchingTemplate.name;
            })
            .map((dataStream) => dataStream.name);
        }
        // /_index_template/_simulate_index/data stream-*
        const finalIndex = await esClient.transport.request({
          method: 'POST',
          path: `/_index_template/_simulate_index/${datastream}`,
        });
        const plan = [];
        let defaultPipeline = finalIndex.template.settings.index.default_pipeline;
        if (!defaultPipeline) {
          defaultPipeline = `${matchingTemplate.name}-default`;
          plan.push({
            title: 'Add default pipeline to template',
            method: 'PUT',
            path: `/_index_template/${matchingTemplate.name}`,
            body: {
              ...matchingTemplate.index_template,
              template: {
                ...matchingTemplate.index_template.template,
                settings: {
                  ...matchingTemplate.index_template.template.settings,
                  default_pipeline: defaultPipeline,
                },
              },
            },
          });
        }

        let pipelineObj = null;
        // if matching template is the managed logs template, we need to "fork" it and create a custom index template for this datastream first
        if (matchingTemplate.name === 'logs') {
          const newPipelineName = datastream;
          console.log(matchingTemplate.index_template);
          plan.push({
            title: 'Create custom index template',
            method: 'PUT',
            path: `/_index_template/${datastream}@template`,
            body: {
              ...matchingTemplate.index_template,
              priority: matchingTemplate.index_template.priority + 100,
              template: {
                ...matchingTemplate.index_template?.template,
                settings: {
                  ...matchingTemplate.index_template?.template?.settings,
                  index: {
                    ...matchingTemplate.index_template?.template?.settings?.index,
                    default_pipeline: newPipelineName,
                  },
                },
              },
              index_patterns: [datastream],
            },
          });
          plan.push({
            title: 'Create custom pipeline',
            method: 'PUT',
            path: `/_ingest/pipeline/${newPipelineName}`,
            body: {
              description: 'Custom pipeline for datastream',
              processors: [
                {
                  // call logs default pipeline first
                  pipeline: {
                    name: 'logs@default-pipeline',
                  },
                },
                change,
              ],
            },
          });
          plan.push({
            title: 'Roll over data stream',
            method: 'POST',
            path: `/${datastream}/_rollover`,
          });
          pipelineObj = await esClient.transport.request({
            method: 'GET',
            path: `/_ingest/pipeline/${defaultPipeline}`,
          });
        } else {
          try {
            pipelineObj = await esClient.transport.request({
              method: 'GET',
              path: `/_ingest/pipeline/${defaultPipeline}`,
            });
            const p = pipelineObj[defaultPipeline];
            const customPipelineIsCalled = p.processors.some((processor) => {
              return (
                processor.pipeline !== undefined &&
                processor.pipeline.name === `${matchingTemplate.name}@custom`
              );
            });
            if (!customPipelineIsCalled) {
              plan.push({
                title: 'Call custom pipeline from default pipeline',
                method: 'PUT',
                path: `/_ingest/pipeline/${defaultPipeline}`,
                body: {
                  ...p,
                  processors: [...p.processors, change],
                },
              });
            } else {
              try {
                const customPipeline = (
                  await esClient.transport.request({
                    method: 'GET',
                    path: `/_ingest/pipeline/${matchingTemplate.name}@custom`,
                  })
                )[matchingTemplate.name + '@custom'];
                plan.push({
                  title: 'Extend custom pipeline',
                  method: 'PUT',
                  body: {
                    ...customPipeline,
                    processors: [...customPipeline.processors, change],
                  },
                });
              } catch (e) {
                // custom pipeline doesn't exist, plan to create

                plan.push({
                  title: 'Create custom pipeline',
                  method: 'PUT',
                  path: `/_ingest/pipeline/${matchingTemplate.name}@custom`,
                  body: {
                    processors: [change],
                  },
                });
              }
            }
          } catch (e) {
            console.log(e);
            // pipeline doesn't exist, plan to create
            plan.push({
              title: 'Create default pipeline',
              method: 'PUT',
              path: `/_ingest/pipeline/${defaultPipeline}`,
              body: {
                description: 'Default pipeline for datastream',
                processors: [change],
              },
            });
          }
        }

        let docs;
        let simulatedRun;
        try {
          // test the pipline by fetching some documents
          const r = await esClient.transport.request({
            method: 'GET',
            path: `${datastream}/_search`,
            body: {
              size: 50,
              sort: [{ '@timestamp': { order: 'desc' } }],
              query:
                request.body.filter !== ''
                  ? {
                      bool: {
                        filter: [...kqlQuery(request.body.filter)],
                      },
                    }
                  : undefined,
            },
          });
          console.log(r);
          docs = r.hits.hits;

          // simulate the pipeline
          simulatedRun = await esClient.transport.request({
            method: 'POST',
            path: `/_ingest/pipeline/_simulate`,
            body: {
              pipeline: {
                description: 'Simulate pipeline',
                processors: [change],
              },
              docs,
            },
          });
        } catch (e) {
          console.log(e);
        }

        return response.ok({
          body: {
            success: true,
            plan,
            docs,
            simulatedRun,
          },
        });
      }
    );

    router.get(
      {
        path: '/api/datastream_retention_info/{datastream}',
        validate: {
          params: schema.object({
            datastream: schema.string(),
          }),
        },
      },
      async (context, request, response) => {
        const esClient = (await context.core).elasticsearch.client.asCurrentUser;
        // fetch the datastream
        const datastream = request.params.datastream;
        const datastreamInfo = (
          await esClient.transport.request({
            method: 'GET',
            path: `/_data_stream/${datastream}`,
          })
        ).data_streams[0];

        const template = (
          await esClient.transport.request({
            method: 'GET',
            path: `/_index_template/${datastreamInfo.template}`,
          })
        ).index_templates[0];
        const allDataStreams = await esClient.transport.request({
          method: 'GET',
          path: '/_data_stream',
        });
        const affectedDatastreams = allDataStreams.data_streams
          .filter((dataStream) => {
            return dataStream.template === template.name;
          })
          .map((dataStream) => dataStream.name);
        // check whether prefer_ilm is set - if yes, fetch the ILM policy
        let ilmPolicy = null;
        if (datastreamInfo.prefer_ilm && datastreamInfo.ilm_policy) {
          ilmPolicy = await esClient.transport.request({
            method: 'GET',
            path: `/_ilm/policy/${datastreamInfo.ilm_policy}`,
          });
        }
        return response.ok({
          body: {
            datastreamInfo,
            template,
            ilmPolicy,
            affectedDatastreams,
          },
        });
      }
    );

    router.get(
      {
        path: '/api/reroute_targets',
        validate: {},
      },
      async (context, request, response) => {
        const esClient = (await context.core).elasticsearch.client.asCurrentUser;
        const datastreams: any = await esClient.transport.request({
          method: 'GET',
          path: '/_data_stream',
        });
        // go through all datastreams and check whether they follow the <type>-<dataset>-<namespace> notation. If yes, add the dataset to a set. In the end, return the set as a list
        const datasets = new Set<string>();
        datastreams.data_streams.forEach((datastream: any) => {
          const parts = datastream.name.split('-');
          if (parts.length === 3) {
            datasets.add(parts[1]);
          }
        });
        return response.ok({
          body: Array.from(datasets),
        });
      }
    );

    router.post(
      {
        path: '/api/test_reroute',
        validate: {
          body: schema.object({
            datastream: schema.string(),
            code: schema.string(),
            filter: schema.string(),
          }),
        },
      },
      async (context, request, response) => {
        try {
          const datastream = request.body.datastream;
          let affectedDatastreams: string[] = [datastream];
          const change = JSON.parse(request.body.code);
          const esClient = (await context.core).elasticsearch.client.asCurrentUser;
          const templates = await esClient.transport.request({
            method: 'GET',
            path: '/_index_template',
          });
          let matchingTemplate = null;
          try {
            const allMatchingTemplates = templates.index_templates
              .filter((template) => {
                const patterns: string[] = template.index_template.index_patterns;
                const matches = patterns.some((pattern) => {
                  const patternToRegex = pattern.replace(/\./g, '\\.').replace(/\*/g, '.*');
                  return new RegExp(patternToRegex).test(datastream);
                });
                return matches;
              })
              .sort((a, b) => {
                // sort by the priority key (highest priority first)
                return b.index_template.priority - a.index_template.priority;
              });
            matchingTemplate = allMatchingTemplates[0];
          } catch (e) {
            return response.customError({ statusCode: 500, body: e });
          }
          if (!matchingTemplate) {
            return response.customError({
              statusCode: 404,
              body: `No matching template found for datastream ${datastream}`,
            });
          } else {
            // check which existing data streams match the matchingTemplate
            const allDataStreams = await esClient.transport.request({
              method: 'GET',
              path: '/_data_stream',
            });
            affectedDatastreams = allDataStreams.data_streams
              .filter((dataStream) => {
                return dataStream.template === matchingTemplate.name;
              })
              .map((dataStream) => dataStream.name);
          }
          // /_index_template/_simulate_index/data stream-*
          const finalIndex = await esClient.transport.request({
            method: 'POST',
            path: `/_index_template/_simulate_index/${datastream}`,
          });
          const plan = [];
          let defaultPipeline = finalIndex.template.settings.index.default_pipeline;
          if (!defaultPipeline) {
            defaultPipeline = `${matchingTemplate.name}-default`;
            plan.push({
              title: 'Add default pipeline to template',
              method: 'PUT',
              path: `/_index_template/${matchingTemplate.name}`,
              body: {
                ...matchingTemplate.index_template,
                template: {
                  ...matchingTemplate.index_template.template,
                  settings: {
                    ...matchingTemplate.index_template.template.settings,
                    default_pipeline: defaultPipeline,
                  },
                },
              },
            });
          }

          let pipelineObj = null;
          // if matching template is the managed logs template, we need to "fork" it and create a custom index template for this datastream first
          if (matchingTemplate.name === 'logs') {
            const newPipelineName = datastream;
            console.log(matchingTemplate.index_template);
            plan.push({
              title: 'Create custom index template',
              method: 'PUT',
              path: `/_index_template/${datastream}@template`,
              body: {
                ...matchingTemplate.index_template,
                priority: matchingTemplate.index_template.priority + 100,
                template: {
                  ...matchingTemplate.index_template?.template,
                  settings: {
                    ...matchingTemplate.index_template?.template?.settings,
                    index: {
                      ...matchingTemplate.index_template?.template?.settings?.index,
                      default_pipeline: newPipelineName,
                    },
                  },
                },
                index_patterns: [datastream],
              },
            });
            plan.push({
              title: 'Create custom pipeline',
              method: 'PUT',
              path: `/_ingest/pipeline/${newPipelineName}`,
              body: {
                description: 'Custom pipeline for datastream',
                processors: [
                  {
                    // call logs default pipeline first
                    pipeline: {
                      name: 'logs@default-pipeline',
                    },
                  },
                  change,
                ],
              },
            });
            plan.push({
              title: 'Roll over data stream',
              method: 'POST',
              path: `/${datastream}/_rollover`,
            });
            pipelineObj = await esClient.transport.request({
              method: 'GET',
              path: `/_ingest/pipeline/${defaultPipeline}`,
            });
          } else {
            try {
              pipelineObj = await esClient.transport.request({
                method: 'GET',
                path: `/_ingest/pipeline/${defaultPipeline}`,
              });
              const p = pipelineObj[defaultPipeline];
              const customPipelineIsCalled = p.processors.some((processor) => {
                return (
                  processor.pipeline !== undefined &&
                  processor.pipeline.name === `${matchingTemplate.name}@custom`
                );
              });
              if (!customPipelineIsCalled) {
                plan.push({
                  title: 'Add new processor from default pipeline',
                  method: 'PUT',
                  path: `/_ingest/pipeline/${defaultPipeline}`,
                  body: {
                    ...p,
                    processors: [...p.processors, change],
                  },
                });
              } else {
                try {
                  const customPipeline = (
                    await esClient.transport.request({
                      method: 'GET',
                      path: `/_ingest/pipeline/${matchingTemplate.name}@custom`,
                    })
                  )[matchingTemplate.name + '@custom'];
                  plan.push({
                    title: 'Extend custom pipeline',
                    method: 'PUT',
                    body: {
                      ...customPipeline,
                      processors: [...customPipeline.processors, change],
                    },
                  });
                } catch (e) {
                  // custom pipeline doesn't exist, plan to create

                  plan.push({
                    title: 'Create custom pipeline',
                    method: 'PUT',
                    path: `/_ingest/pipeline/${matchingTemplate.name}@custom`,
                    body: {
                      processors: [change],
                    },
                  });
                }
              }
            } catch (e) {
              console.log(e);
              // pipeline doesn't exist, plan to create
              plan.push({
                title: 'Create default pipeline',
                method: 'PUT',
                path: `/_ingest/pipeline/${defaultPipeline}`,
                body: {
                  description: 'Default pipeline for datastream',
                  processors: [
                    {
                      pipeline: {
                        name: `${matchingTemplate.name}@default-pipeline`,
                      },
                    },
                  ],
                },
              });
              // plan to create the custom pipeline
              plan.push({
                title: 'Create custom pipeline',
                method: 'PUT',
                path: `/_ingest/pipeline/${matchingTemplate.name}@pipeline`,
                body: {
                  processors: [change],
                },
              });
            }
          }

          let docs;
          let simulatedRun;
          try {
            // test the pipline by fetching some documents
            const r = await esClient.transport.request({
              method: 'GET',
              path: `${datastream}/_search`,
              body: {
                size: 100,
                sort: [{ '@timestamp': { order: 'desc' } }],
                query:
                  request.body.filter !== ''
                    ? {
                        bool: {
                          filter: [...kqlQuery(request.body.filter)],
                        },
                      }
                    : undefined,
              },
            });
            console.log(r);
            docs = r.hits.hits;

            // simulate the pipeline
            const req = {
              method: 'POST',
              path: `/_ingest/_simulate`,
              body: {
                pipeline_substitutions: {
                  [defaultPipeline]: {
                    ...pipelineObj[defaultPipeline],
                    processors: [...pipelineObj[defaultPipeline].processors, change],
                  },
                },
                docs,
              },
            };
            console.log(JSON.stringify(req, null, 2));
            simulatedRun = await esClient.transport.request(req);
          } catch (e) {
            console.log(e);
          }

          return response.ok({
            body: {
              success: true,
              plan,
              docs,
              simulatedRun,
              affectedDatastreams,
            },
          });
        } catch (e) {
          console.log(e);
          throw e;
        }
      }
    );

    router.post(
      {
        path: '/api/apply_plan',
        validate: {
          body: schema.object({
            plan: schema.arrayOf(
              schema.object({
                title: schema.string(),
                method: schema.string(),
                path: schema.string(),
                body: schema.maybe(schema.nullable(schema.any())),
              })
            ),
          }),
        },
      },
      async (context, request, response) => {
        // plan is an array of objects with title, method, path, and body
        // execute all of them with the es client
        try {
          const esClient = (await context.core).elasticsearch.client.asCurrentUser;
          const plan = request.body.plan;
          const results = [];
          for (const step of plan) {
            const result = await esClient.transport.request({
              method: step.method,
              path: step.path,
              body: step.body,
            });
            results.push(result);
          }
          return response.ok({
            body: results,
          });
        } catch (e) {
          console.log(e);
          throw e;
        }
      }
    );
    return {};
  }

  start(core: CoreStart, pluginsStart: InventoryStartDependencies): InventoryServerStart {
    return {};
  }
}
