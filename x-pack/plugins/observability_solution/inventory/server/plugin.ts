/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { get, isEqual, mapValues } from 'lodash';
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
import { fetchEntityDefinitions } from './routes/entities/route';
import {
  Entity,
  InventoryEntityDefinition,
  getPainlessCheck,
  getPainlessDefinitionCheck,
} from '../common/entities';

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

        function deepSortKeys(obj: any): any {
          if (Array.isArray(obj)) {
            return obj.map(deepSortKeys);
          } else if (obj !== null && typeof obj === 'object') {
            const sortedObj: { [key: string]: any } = {};
            Object.keys(obj)
              .sort()
              .forEach((key) => {
                sortedObj[key] = deepSortKeys(obj[key]);
              });
            return sortedObj;
          }
          return obj;
        }

        const fullSet = new Set<string>();
        try {
          const start = await startServicesPromise;
          const { definitions } = await fetchEntityDefinitions({
            plugins: { entityManager: { start: () => Promise.resolve(start.entityManager) } },
            request,
          });
          simulatedRun.docs.forEach((after, i) => {
            const before = docs[i];
            if (after.error) return;
            const hasChanges = Object.keys(after.doc._source).some((key) => {
              const beforeJson = JSON.stringify(deepSortKeys(before._source[key]));
              const afterJson = JSON.stringify(deepSortKeys(after.doc._source[key]));
              return beforeJson !== afterJson;
            });
            console.log('hasChanges', hasChanges);
            if (!hasChanges) return;
            console.log(definitions);
            // find all entity definitions that match the current doc after the change
            definitions.filter((definition) => {
              // check whether the "identifyingFields" are present in the document: { field: string; optional: boolean; }
              const identifyingFields = definition.identityFields;
              const matches = identifyingFields.every((field) => {
                if (field.optional) {
                  return true;
                }
                if (field.field === 'data_stream.type') {
                  // for the sample data
                  return true;
                }
                const hasAsDottedFieldName = field.field in after.doc._source;
                const splitFieldName = field.field.split('.');
                let obj = after.doc._source;
                splitFieldName.forEach((part) => {
                  if (obj && obj[part]) {
                    obj = obj[part];
                  } else {
                    obj = null;
                  }
                });
                const hasAsNestedFieldName = obj !== null;

                return hasAsDottedFieldName || hasAsNestedFieldName;
              });
              if (matches) {
                // concat all identifying fields to a string
                const id = identifyingFields
                  .map(
                    (field) =>
                      after.doc._source[field.field] ||
                      get(after.doc._source, field.field) ||
                      'logs'
                  )
                  .join('-');
                fullSet.add(`${id} (${definition.type})`);
              }
            });
          });
        } catch (e) {
          console.log(e);
          throw e;
        }

        return response.ok({
          body: {
            success: true,
            plan,
            docs,
            simulatedRun,
            affectedEntities: Array.from(fullSet),
          },
        });
      }
    );

    router.post(
      {
        path: '/api/apply_per_entity_change/plan',
        validate: {
          body: schema.object({}, { unknowns: 'allow' }),
        },
      },
      async (context, request, response) => {
        const entity: Entity = request.body.entity;
        const change = request.body.change;
        const esClient = (await context.core).elasticsearch.client.asCurrentUser;
        const pipelines = await esClient.transport.request({
          method: 'GET',
          path: `/_ingest/pipeline`,
        });
        const pipelineName = `${entity.displayName}@entity`;
        const plan = [];
        const matchingPipeline = pipelines[pipelineName] || { processors: [] };
        matchingPipeline.processors.push(change);

        const pipelineReferencedInMainPipeline = pipelines['logs@main'].processors.some(
          (processor) => {
            return processor.pipeline?.name === pipelineName;
          }
        );

        if (!pipelineReferencedInMainPipeline) {
          const lastProcessorIndex = pipelines['logs@main'].processors.findIndex(
            (p) => p.remove?.field === '__original_doc'
          );
          const newProcessors = pipelines['logs@main'].processors.slice();
          newProcessors.splice(lastProcessorIndex, 0, {
            pipeline: { name: pipelineName, ignore_failure: true, if: getPainlessCheck(entity) },
          });
          plan.push({
            title: 'Add pipeline to main pipeline',
            method: 'PUT',
            path: `/_ingest/pipeline/logs@main`,
            body: {
              ...pipelines['logs@main'],
              processors: newProcessors,
            },
          });
        }

        plan.push({
          title: 'Create custom pipeline',
          method: 'PUT',
          path: `/_ingest/pipeline/${pipelineName}`,
          body: matchingPipeline,
        });

        let docs;
        let simulatedRun;
        try {
          const identityFields = entity.properties['entity.identityFields'] as string[] | string;
          const filters = (Array.isArray(identityFields) ? identityFields : [identityFields]).map(
            (field) => ({
              term: {
                [field]: entity.properties[field],
              },
            })
          );
          // test the pipline by fetching some documents
          const body = {
            size: 100,
            sort: [{ '@timestamp': { order: 'desc' } }],
            query: {
              bool: {
                filter: [
                  ...(request.body.filter !== '' ? kqlQuery(request.body.filter) : []),
                  ...filters,
                ],
              },
            },
          };
          const r = await esClient.transport.request({
            method: 'GET',
            path: `logs-*/_search`,
            body,
          });
          console.log(JSON.stringify(body, null, 2));
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

        function deepSortKeys(obj: any): any {
          if (Array.isArray(obj)) {
            return obj.map(deepSortKeys);
          } else if (obj !== null && typeof obj === 'object') {
            const sortedObj: { [key: string]: any } = {};
            Object.keys(obj)
              .sort()
              .forEach((key) => {
                sortedObj[key] = deepSortKeys(obj[key]);
              });
            return sortedObj;
          }
          return obj;
        }

        const fullSet = new Set<string>();
        try {
          const start = await startServicesPromise;
          const { definitions } = await fetchEntityDefinitions({
            plugins: { entityManager: { start: () => Promise.resolve(start.entityManager) } },
            request,
          });
          simulatedRun.docs.forEach((after, i) => {
            const before = docs[i];
            if (after.error) return;
            const hasChanges = Object.keys(after.doc._source).some((key) => {
              const beforeJson = JSON.stringify(deepSortKeys(before._source[key]));
              const afterJson = JSON.stringify(deepSortKeys(after.doc._source[key]));
              return beforeJson !== afterJson;
            });
            if (!hasChanges) return;
            // find all entity definitions that match the current doc after the change
            definitions.filter((definition) => {
              // check whether the "identifyingFields" are present in the document: { field: string; optional: boolean; }
              const identifyingFields = definition.identityFields;
              const matches = identifyingFields.every((field) => {
                if (field.optional) {
                  return true;
                }
                if (field.field === 'data_stream.type') {
                  // for the sample data
                  return true;
                }
                const hasAsDottedFieldName = field.field in after.doc._source;
                const splitFieldName = field.field.split('.');
                let obj = after.doc._source;
                splitFieldName.forEach((part) => {
                  if (obj && obj[part]) {
                    obj = obj[part];
                  } else {
                    obj = null;
                  }
                });
                const hasAsNestedFieldName = obj !== null;

                return hasAsDottedFieldName || hasAsNestedFieldName;
              });
              if (matches) {
                // concat all identifying fields to a string
                const id = identifyingFields
                  .map(
                    (field) =>
                      after.doc._source[field.field] ||
                      get(after.doc._source, field.field) ||
                      'logs'
                  )
                  .join('-');
                fullSet.add(`${id} (${definition.type})`);
              }
            });
          });
        } catch (e) {
          console.log(e);
          throw e;
        }

        return response.ok({
          body: {
            success: true,
            plan,
            docs,
            simulatedRun,
            affectedEntities: Array.from(fullSet),
          },
        });
      }
    );

    router.post(
      {
        path: '/api/apply_per_entity_definition_change/plan',
        validate: {
          body: schema.object({}, { unknowns: 'allow' }),
        },
      },
      async (context, request, response) => {
        try {
          const entityDefinition: InventoryEntityDefinition = request.body.entityDefinition;
          const change = request.body.change;
          const esClient = (await context.core).elasticsearch.client.asCurrentUser;
          const pipelines = await esClient.transport.request({
            method: 'GET',
            path: `/_ingest/pipeline`,
          });
          const pipelineName = `${entityDefinition.type}@entity-type`;
          const plan = [];
          const matchingPipeline = pipelines[pipelineName] || { processors: [] };
          matchingPipeline.processors.push(change);

          const pipelineReferencedInMainPipeline = pipelines['logs@main'].processors.some(
            (processor) => {
              return processor.pipeline?.name === pipelineName;
            }
          );

          if (!pipelineReferencedInMainPipeline) {
            const lastProcessorIndex = pipelines['logs@main'].processors.findIndex(
              (p) => p.remove?.field === '__original_doc'
            );
            const newProcessors = pipelines['logs@main'].processors.slice();
            newProcessors.splice(lastProcessorIndex, 0, {
              pipeline: {
                name: pipelineName,
                ignore_failure: true,
                if: getPainlessDefinitionCheck(entityDefinition),
              },
            });
            plan.push({
              title: 'Add pipeline to main pipeline',
              method: 'PUT',
              path: `/_ingest/pipeline/logs@main`,
              body: {
                ...pipelines['logs@main'],
                processors: newProcessors,
              },
            });
          }

          plan.push({
            title: 'Create custom pipeline',
            method: 'PUT',
            path: `/_ingest/pipeline/${pipelineName}`,
            body: matchingPipeline,
          });

          let docs;
          let simulatedRun;
          try {
            const filters = entityDefinition.identityFields.map((field) => ({
              exists: {
                field: field.field,
              },
            }));
            // test the pipline by fetching some documents
            const body = {
              size: 100,
              sort: [{ '@timestamp': { order: 'desc' } }],
              query: {
                bool: {
                  filter: [
                    ...(request.body.filter !== '' ? kqlQuery(request.body.filter) : []),
                    ...filters,
                  ],
                },
              },
            };
            const r = await esClient.transport.request({
              method: 'GET',
              path: `logs-*/_search`,
              body,
            });
            console.log(JSON.stringify(body, null, 2));
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

          function deepSortKeys(obj: any): any {
            if (Array.isArray(obj)) {
              return obj.map(deepSortKeys);
            } else if (obj !== null && typeof obj === 'object') {
              const sortedObj: { [key: string]: any } = {};
              Object.keys(obj)
                .sort()
                .forEach((key) => {
                  sortedObj[key] = deepSortKeys(obj[key]);
                });
              return sortedObj;
            }
            return obj;
          }

          const fullSet = new Set<string>();
          try {
            const start = await startServicesPromise;
            const { definitions } = await fetchEntityDefinitions({
              plugins: { entityManager: { start: () => Promise.resolve(start.entityManager) } },
              request,
            });
            simulatedRun.docs.forEach((after, i) => {
              const before = docs[i];
              if (after.error) return;
              const hasChanges = Object.keys(after.doc._source).some((key) => {
                const beforeJson = JSON.stringify(deepSortKeys(before._source[key]));
                const afterJson = JSON.stringify(deepSortKeys(after.doc._source[key]));
                return beforeJson !== afterJson;
              });
              if (!hasChanges) return;
              // find all entity definitions that match the current doc after the change
              definitions.filter((definition) => {
                // check whether the "identifyingFields" are present in the document: { field: string; optional: boolean; }
                const identifyingFields = definition.identityFields;
                const matches = identifyingFields.every((field) => {
                  if (field.optional) {
                    return true;
                  }
                  if (field.field === 'data_stream.type') {
                    // for the sample data
                    return true;
                  }
                  const hasAsDottedFieldName = field.field in after.doc._source;
                  const splitFieldName = field.field.split('.');
                  let obj = after.doc._source;
                  splitFieldName.forEach((part) => {
                    if (obj && obj[part]) {
                      obj = obj[part];
                    } else {
                      obj = null;
                    }
                  });
                  const hasAsNestedFieldName = obj !== null;

                  return hasAsDottedFieldName || hasAsNestedFieldName;
                });
                if (matches) {
                  // concat all identifying fields to a string
                  const id = identifyingFields
                    .map(
                      (field) =>
                        after.doc._source[field.field] ||
                        get(after.doc._source, field.field) ||
                        'logs'
                    )
                    .join('-');
                  fullSet.add(`${id} (${definition.type})`);
                }
              });
            });
          } catch (e) {
            console.log(e);
            throw e;
          }

          return response.ok({
            body: {
              success: true,
              plan,
              docs,
              simulatedRun,
              affectedEntities: Array.from(fullSet),
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
        path: '/api/track_pipelines',
        validate: {},
      },
      async (context, request, response) => {
        try {
          const esClient = (await context.core).elasticsearch.client.asCurrentUser;
          // we need to do the following things here:
          // * fetch all pipeline definitions
          // * check whether they have a processor with tag "track-pipeline-invocation" already
          // * if not, add it as an "append" processor to the top of the pipeline, adding the pipeline name to the "invoked_pipelines" field
          // * if yes, check whether the processor is still at the top of the pipeline and sets the correct pipeline name. If not, update the pipeline
          const pipelines = await esClient.transport.request({
            method: 'GET',
            path: '/_ingest/pipeline',
          });
          const plan = [];
          Object.entries(pipelines).forEach(([id, pipeline]: [string, any]) => {
            const updatedProcessors = pipeline.processors.filter(
              (processor: any) => processor.append?.tag !== 'track-pipeline-invocation'
            );
            updatedProcessors.unshift({
              append: {
                field: 'invoked_pipelines',
                value: id,
                tag: 'track-pipeline-invocation',
              },
            });
            if (!isEqual(updatedProcessors, pipeline.processors)) {
              plan.push({
                title: 'Add tracking processor to pipeline',
                method: 'PUT',
                path: `/_ingest/pipeline/${id}`,
                body: {
                  ...pipeline,
                  processors: updatedProcessors,
                },
              });
            }
          });

          // execute the plan
          for (const step of plan) {
            console.log('executing', JSON.stringify(step, null, 2));
            await esClient.transport.request({
              method: step.method,
              path: step.path,
              body: step.body,
            });
          }

          return response.ok({
            body: {
              updatedPipelines: plan.map((p) => p.path),
              plan,
            },
          });
        } catch (e) {
          console.log(e);
          throw e;
        }
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

    router.post(
      {
        path: '/api/pipelines_for_entity',
        validate: {
          body: schema.object({
            query: schema.object({}, { unknowns: 'allow' }),
            kuery: schema.string({ defaultValue: '' }),
          }),
        },
      },
      async (context, request, response) => {
        const esClient = (await context.core).elasticsearch.client.asCurrentUser;
        // fetch terms invoked_pipelines for the given query on logs-*
        const query = request.body.query;
        const r = await esClient.transport.request({
          method: 'POST',
          path: '/logs-*/_search',
          body: {
            size: 0,
            query: {
              bool: {
                filter: [...kqlQuery(request.body.kuery), query],
              },
            },
            track_total_hits: true,
            aggs: {
              pipelines: {
                terms: {
                  field: 'invoked_pipelines',
                  size: 100,
                },
              },
            },
          },
        });

        return response.ok({
          body: r,
        });
      }
    );

    router.get(
      {
        path: '/api/main_pipeline',
        validate: {},
      },
      async (context, request, response) => {
        try {
          const esClient = (await context.core).elasticsearch.client.asCurrentUser;
          const pipelines: any = await esClient.transport.request({
            method: 'GET',
            path: '/_ingest/pipeline',
          });
          const pipelineMap = new Map<string, any>();
          Object.entries(pipelines).forEach(([id, pipeline]: any) => {
            pipelineMap.set(id, { ...pipeline, name: `p:${id}` });
          });
          // recursively resolve all sub-pipelines
          const resolvePipeline = (pipeline: any) => {
            const processors = pipeline.processors || [];
            processors.forEach((processor: any) => {
              if (processor.pipeline) {
                const subPipeline = pipelineMap.get(processor.pipeline.name);
                const innerProcessors = resolvePipeline(subPipeline);
                processor.pipeline.subProcessors = innerProcessors;
              }
            });
            return processors;
          };
          const mainPipeline = pipelineMap.get('logs@main');
          const processors = resolvePipeline(mainPipeline);
          return response.ok({
            body: { processors },
          });
        } catch (e) {
          console.log(e);
          throw e;
        }
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

    router.get(
      {
        path: '/api/processing_overview',
        validate: {
          params: schema.object({}),
        },
      },
      async (context, request, response) => {
        try {
          const esClient = (await context.core).elasticsearch.client.asCurrentUser;
          const datastreams: any = await esClient.transport.request({
            method: 'GET',
            path: '/_data_stream',
          });
          const datastreamMap = new Map<string, any>();
          datastreams.data_streams.forEach((datastream: any) => {
            datastreamMap.set(datastream.name, datastream);
          });
          const templates: any = await esClient.transport.request({
            method: 'GET',
            path: '/_index_template',
          });
          const templateMap = new Map<string, any>();
          templates.index_templates.forEach((template: any) => {
            templateMap.set(template.name, template.index_template);
          });
          const componentTemplateMap = new Map<string, any>();
          const componentTemplates: any = await esClient.transport.request({
            method: 'GET',
            path: '/_component_template',
          });
          componentTemplates.component_templates.forEach((template: any) => {
            componentTemplateMap.set(template.name, template.component_template);
          });
          const pipelines: any = await esClient.transport.request({
            method: 'GET',
            path: '/_ingest/pipeline',
          });
          const pipelineMap = new Map<string, any>();
          Object.entries(pipelines).forEach(([id, pipeline]: any) => {
            pipelineMap.set(id, { ...pipeline, name: `p:${id}` });
          });
          let nodes = [...Array.from(datastreamMap.values()), ...Array.from(pipelineMap.values())];
          const edges = [];

          nodes.forEach((node: any) => {
            if (node.processors) {
              // only handle datastreams here
              return;
            }
            // draw the edges between the datastreams. This works like this:
            // * for the current datastream, resolve the template
            // * check whether the template has a default pipeline by checking the index settings and all the referenced component templates
            // * for the default pipeline, resolve all sub-pipelines called via processor
            // * then check through all of them whether they have a reroute processor.
            // * if they do, add an edge from the current datastream to the target datastream
            console.log('taking care of node', node.name);
            const template = templateMap.get(node.template);
            // resolve all component templates
            const componentTemplates = (template.composed_of || []).map((component: any) => {
              return componentTemplateMap.get(component);
            });
            // search for the default pipeline
            let defaultPipeline = template.template?.settings?.index?.default_pipeline;
            if (!defaultPipeline) {
              // search through all component templates
              for (const componentTemplate of componentTemplates) {
                defaultPipeline = componentTemplate?.template?.settings?.index?.default_pipeline;
                if (defaultPipeline) {
                  break;
                }
              }
            }
            console.log('default pipeline', defaultPipeline);
            if (defaultPipeline) {
              nodes.push({
                name: `p:${defaultPipeline} (for ${node.name})`,
                processors: pipelineMap.get(defaultPipeline).processors,
              });
              edges.push({ source: `p:${defaultPipeline} (for ${node.name})`, target: node.name });
            }
          });

          nodes.forEach((node: any) => {
            if (!node.processors || !node.name.includes('(for ')) {
              // only handle pipelines here (and not their duplicates)
              return;
            }
            console.log('taking care of pipeline node', node.name);
            const defaultPipelineObj = node;
            // recursively resolve pipelines called via "pipeline" processors
            const resolvePipeline = (pipeline: any) => {
              const processors = pipeline?.processors || [];
              processors.forEach((processor: any) => {
                console.log('visiting processor', processor);
                if (processor.pipeline) {
                  const subPipeline = pipelineMap.get(processor.pipeline.name);
                  const innerProcessors = resolvePipeline(subPipeline);
                  processor.pipeline.subProcessors = innerProcessors;
                }
                if (processor.reroute) {
                  // find datastreams that could be the target. processor.reroute.dataset is the middle part of the <type>-<dataset>-<namespace> naming scheme
                  const targetDatastreams = datastreams.data_streams
                    .filter((datastream: any) => {
                      const parts = datastream.name.split('-');
                      return parts[1] === processor.reroute.dataset;
                    })
                    .forEach((datastream: any) => {
                      // for that data stream, find the default pipeline
                      const template = templateMap.get(datastream.template);
                      // resolve all component templates
                      const componentTemplates = (template.composed_of || []).map(
                        (component: any) => {
                          return componentTemplateMap.get(component);
                        }
                      );
                      // search for the default pipeline
                      let defaultPipeline = template.template?.settings?.index?.default_pipeline;
                      if (!defaultPipeline) {
                        // search through all component templates
                        for (const componentTemplate of componentTemplates) {
                          defaultPipeline =
                            componentTemplate?.template?.settings?.index?.default_pipeline;
                          if (defaultPipeline) {
                            break;
                          }
                        }
                      }

                      if (defaultPipeline) {
                        console.log(
                          `Trying to add edge from ${node.name} to p:${defaultPipeline} (for ${datastream.name})`
                        );
                        // find all nodes that start with "p:${node.name} (for" and add the edge to the target
                        // nodes.forEach((n: any) => {
                        //   console.log(">>> probing node", n.name);
                        //   if (n.name.startsWith(`p:${node.name} (for`)) {
                        edges.push({
                          source: node.name,
                          target: `p:${defaultPipeline} (for ${datastream.name})`,
                        });
                        //   }
                        // });
                      }
                    });
                }
              });
              return processors;
            };
            resolvePipeline(defaultPipelineObj);
          });

          // trim out all nodes that don't have any edges
          const nodeNames = new Set<string>();
          edges.forEach((edge) => {
            nodeNames.add(edge.source);
            nodeNames.add(edge.target);
          });
          nodes = nodes.filter((node) => {
            return nodeNames.has(node.name);
          });

          return response.ok({
            body: { nodes, edges },
          });
        } catch (e) {
          console.log(e);
          throw e;
        }
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
                    processors: [change],
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
