/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { mapValues } from 'lodash';
import { registerServerRoutes } from './routes/register_routes';
import { InventoryRouteHandlerResources } from './routes/types';
import type {
  ConfigSchema,
  InventoryServerSetup,
  InventoryServerStart,
  InventorySetupDependencies,
  InventoryStartDependencies,
} from './types';
import { schema } from '@kbn/config-schema';

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
        const change = request.body.change;
        const esClient = (await context.core).elasticsearch.client.asCurrentUser;
        const templates = await esClient.transport.request({
          method: 'GET',
          path: '/_index_template',
        });
        let matchingTemplate = null;
        try {
          matchingTemplate = templates.index_templates.find((template) => {
            const patterns: string[] = template.index_template.index_patterns;
            return patterns.some((pattern) => {
              const patternToRegex = pattern.replace(/\*/g, '.*').replace(/\./g, '\\.');
              return new RegExp(patternToRegex).test(datastream);
            });
          });
        } catch (e) {
          return response.customError({ statusCode: 500, body: e });
        }
        if (!matchingTemplate) {
          return response.customError({
            statusCode: 404,
            body: `No matching template found for datastream ${datastream}`,
          });
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
                processors: [
                  ...p.processors,
                  {
                    pipeline: {
                      name: `${matchingTemplate.name}@custom`,
                    },
                  },
                ],
              },
            });
            plan.push({
              title: 'Create custom pipeline',
              method: 'PUT',
              path: `/_ingest/pipeline/${matchingTemplate.name}@custom`,
              body: {
                processors: [change],
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
                    name: `${matchingTemplate.name}@custom`,
                  },
                },
              ],
            },
          });
          // plan to create the custom pipeline
          plan.push({
            title: 'Create custom pipeline',
            method: 'PUT',
            path: `/_ingest/pipeline/${matchingTemplate.name}@custom`,
            body: {
              processors: [change],
            },
          });
        }

        let docs = undefined;
        let simulatedRun = undefined;
        try {
          // test the pipline by fetching some documents
          const r = await esClient.transport.request({
            method: 'GET',
            path: `${datastream}/_search`,
            body: {
              size: 5,
              sort: [{ '@timestamp': { order: 'desc' } }],
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

    return {};
  }

  start(core: CoreStart, pluginsStart: InventoryStartDependencies): InventoryServerStart {
    return {};
  }
}
