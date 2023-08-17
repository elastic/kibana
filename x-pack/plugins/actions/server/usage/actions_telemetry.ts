/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { AggregationsTermsAggregateBase } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  AvgActionRunOutcomeByConnectorTypeBucket,
  parseActionRunOutcomeByConnectorTypesBucket,
} from './lib/parse_connector_type_bucket';
import { AlertHistoryEsIndexConnectorId } from '../../common';
import { ActionResult, InMemoryConnector } from '../types';

interface InMemoryAggRes {
  total: number;
  actionRefs: Record<string, { actionRef: string; actionTypeId: string }>;
}

export async function getTotalCount(
  esClient: ElasticsearchClient,
  kibanaIndex: string,
  logger: Logger,
  inMemoryConnectors?: InMemoryConnector[]
) {
  const scriptedMetric = {
    scripted_metric: {
      init_script: 'state.types = [:]',
      map_script: `
        String actionType = doc['action.actionTypeId'].value;
        if (actionType =~ /\.gen-ai/) {
          String genAiActionType = actionType +"__"+ doc['apiProvider'].value;
          state.types.put(genAiActionType, state.types.containsKey(genAiActionType) ? state.types.get(genAiActionType) + 1 : 1);
        } else {
          state.types.put(actionType, state.types.containsKey(actionType) ? state.types.get(actionType) + 1 : 1);
        }
      `,
      // Combine script is executed per cluster, but we already have a key-value pair per cluster.
      // Despite docs that say this is optional, this script can't be blank.
      combine_script: 'return state',
      // Reduce script is executed across all clusters, so we need to add up all the total from each cluster
      // This also needs to account for having no data
      reduce_script: `
        HashMap result = new HashMap();
        HashMap combinedTypes = new HashMap();
        for (state in states) {
          for (String type : state.types.keySet()) {
            int typeCount = combinedTypes.containsKey(type) ? combinedTypes.get(type) + state.types.get(type) : state.types.get(type);
            combinedTypes.put(type, typeCount);
          }
        }

        result.types = combinedTypes;
        return result;
      `,
    },
  };
  try {
    const searchResult = await esClient.search<
      unknown,
      { byActionTypeId: { value: { types: Record<string, number> } } }
    >({
      index: kibanaIndex,
      size: 0,
      runtime_mappings: {
        apiProvider: {
          type: 'keyword',
          script: {
            // add apiProvider to the doc so we can use it in the scripted_metric
            source: `
            if (doc['action.actionTypeId'].value =~ /\.gen-ai/) {
              emit(params._source["action"]["config"]["apiProvider"])
            }
            `,
          },
        },
      },
      body: {
        query: {
          bool: {
            filter: [{ term: { type: 'action' } }],
          },
        },
        aggs: {
          byActionTypeId: scriptedMetric,
        },
      },
    });

    const aggs = searchResult.aggregations?.byActionTypeId.value?.types ?? {};
    const { countGenAiProviderTypes, countByType } = getCounts(aggs);

    if (inMemoryConnectors && inMemoryConnectors.length) {
      for (const inMemoryConnector of inMemoryConnectors) {
        const actionTypeId = replaceFirstAndLastDotSymbols(inMemoryConnector.actionTypeId);
        countByType[actionTypeId] = countByType[actionTypeId] || 0;
        countByType[actionTypeId]++;
      }
    }

    const totals =
      Object.keys(aggs).reduce((total, key) => parseInt(aggs[key].toString(), 10) + total, 0) +
      (inMemoryConnectors?.length ?? 0);

    return {
      hasErrors: false,
      countTotal: totals,
      countByType,
      countGenAiProviderTypes,
    };
  } catch (err) {
    const errorMessage = err && err.message ? err.message : err.toString();

    logger.warn(`Error executing actions telemetry task: getTotalCount - ${JSON.stringify(err)}`);

    return {
      hasErrors: true,
      errorMessage,
      countTotal: 0,
      countByType: {},
      countGenAiProviderTypes: {},
    };
  }
}

export async function getInUseTotalCount(
  esClient: ElasticsearchClient,
  kibanaIndex: string,
  logger: Logger,
  referenceType?: string,
  inMemoryConnectors?: InMemoryConnector[]
): Promise<{
  hasErrors: boolean;
  errorMessage?: string;
  countTotal: number;
  countByType: Record<string, number>;
  countByAlertHistoryConnectorType: number;
  countEmailByService: Record<string, number>;
  countNamespaces: number;
}> {
  const getInMemoryActionScriptedMetric = (actionRefPrefix: string) => ({
    scripted_metric: {
      init_script: 'state.actionRefs = new HashMap(); state.total = 0;',
      map_script: `
        String actionRef = doc['alert.actions.actionRef'].value;
        String actionTypeId = doc['alert.actions.actionTypeId'].value;
        if (actionRef.startsWith('${actionRefPrefix}') && state.actionRefs[actionRef] === null) {
          HashMap map = new HashMap();
          map.actionRef = actionRef;
          map.actionTypeId = actionTypeId;
          state.actionRefs[actionRef] = map;
          state.total++;
        }
      `,
      // Combine script is executed per cluster, but we already have a key-value pair per cluster.
      // Despite docs that say this is optional, this script can't be blank.
      combine_script: 'return state',
      // Reduce script is executed across all clusters, so we need to add up all the total from each cluster
      // This also needs to account for having no data
      reduce_script: `
          Map actionRefs = [:];
          long total = 0;
          for (state in states) {
            if (state !== null) {
              total += state.total;
              for (String k : state.actionRefs.keySet()) {
                actionRefs.put(k, state.actionRefs.get(k));
              }
            }
          }
          Map result = new HashMap();
          result.total = total;
          result.actionRefs = actionRefs;
          return result;
      `,
    },
  });

  const scriptedMetric = {
    scripted_metric: {
      init_script: 'state.connectorIds = new HashMap(); state.total = 0;',
      map_script: `
        String connectorId = doc['references.id'].value;
        String actionRef = doc['references.name'].value;
        if (state.connectorIds[connectorId] === null) {
          state.connectorIds[connectorId] = actionRef;
          state.total++;
        }
      `,
      // Combine script is executed per cluster, but we already have a key-value pair per cluster.
      // Despite docs that say this is optional, this script can't be blank.
      combine_script: 'return state',
      // Reduce script is executed across all clusters, so we need to add up all the total from each cluster
      // This also needs to account for having no data
      reduce_script: `
          Map connectorIds = [:];
          long total = 0;
          for (state in states) {
            if (state !== null) {
              total += state.total;
              for (String k : state.connectorIds.keySet()) {
                connectorIds.put(k, connectorIds.containsKey(k) ? connectorIds.get(k) + state.connectorIds.get(k) : state.connectorIds.get(k));
              }
            }
          }
          Map result = new HashMap();
          result.total = total;
          result.connectorIds = connectorIds;
          return result;
      `,
    },
  };

  const preconfiguredActionsScriptedMetric = getInMemoryActionScriptedMetric('preconfigured:');
  const systemActionsScriptedMetric = getInMemoryActionScriptedMetric('system_action:');

  const mustQuery = [
    {
      bool: {
        should: [
          {
            nested: {
              path: 'references',
              query: {
                bool: {
                  filter: {
                    bool: {
                      must: [
                        {
                          term: {
                            'references.type': 'action',
                          },
                        },
                      ],
                    },
                  },
                },
              },
            },
          },
          {
            nested: {
              path: 'alert.actions',
              query: {
                bool: {
                  filter: {
                    bool: {
                      must: [
                        {
                          prefix: {
                            'alert.actions.actionRef': {
                              value: 'preconfigured:',
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              },
            },
          },
          {
            nested: {
              path: 'alert.actions',
              query: {
                bool: {
                  filter: {
                    bool: {
                      must: [
                        {
                          prefix: {
                            'alert.actions.actionRef': {
                              value: 'system_action:',
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              },
            },
          },
        ],
      },
    },
  ] as QueryDslQueryContainer[];

  if (!!referenceType) {
    mustQuery.push({
      term: { type: referenceType },
    });
  }

  try {
    const actionResults = await esClient.search<
      unknown,
      {
        refs: { actionRefIds: { value: { total: number; connectorIds: Record<string, string> } } };
        preconfigured_actions: { preconfiguredActionRefIds: { value: InMemoryAggRes } };
        system_actions: { systemActionRefIds: { value: InMemoryAggRes } };
      }
    >({
      index: kibanaIndex,
      size: 0,
      body: {
        query: {
          bool: {
            filter: {
              bool: {
                must_not: {
                  term: {
                    type: 'action_task_params',
                  },
                },
                must: mustQuery,
              },
            },
          },
        },
        aggs: {
          refs: {
            nested: {
              path: 'references',
            },
            aggs: {
              actionRefIds: scriptedMetric,
            },
          },
          preconfigured_actions: {
            nested: {
              path: 'alert.actions',
            },
            aggs: {
              preconfiguredActionRefIds: preconfiguredActionsScriptedMetric,
            },
          },
          system_actions: {
            nested: {
              path: 'alert.actions',
            },
            aggs: {
              systemActionRefIds: systemActionsScriptedMetric,
            },
          },
        },
      },
    });

    const aggs = actionResults.aggregations?.refs.actionRefIds.value;

    const preconfiguredActionsAggs =
      actionResults.aggregations?.preconfigured_actions?.preconfiguredActionRefIds.value;

    const systemActionsAggs = actionResults.aggregations?.system_actions?.systemActionRefIds.value;

    const totalInMemoryActions =
      (preconfiguredActionsAggs?.total ?? 0) + (systemActionsAggs?.total ?? 0);

    const { hits: actions } = await esClient.search<{
      action: ActionResult;
      namespaces: string[];
    }>({
      index: kibanaIndex,
      _source_includes: ['action', 'namespaces'],
      body: {
        query: {
          bool: {
            must: [
              {
                term: { type: 'action' },
              },
              {
                terms: {
                  _id: Object.entries(aggs?.connectorIds ?? {}).map(([key]) => `action:${key}`),
                },
              },
            ],
          },
        },
      },
    });

    const countByActionTypeId = actions.hits.reduce(
      (actionTypeCount: Record<string, number>, action) => {
        const actionSource = action._source!;
        const alertTypeId = replaceFirstAndLastDotSymbols(actionSource.action.actionTypeId);
        const currentCount =
          actionTypeCount[alertTypeId] !== undefined ? actionTypeCount[alertTypeId] : 0;
        actionTypeCount[alertTypeId] = currentCount + 1;
        return actionTypeCount;
      },
      {}
    );

    const namespacesList = actions.hits.reduce((_namespaces: Set<string>, action) => {
      const namespaces = action._source?.namespaces ?? ['default'];
      namespaces.forEach((namespace) => {
        if (!_namespaces.has(namespace)) {
          _namespaces.add(namespace);
        }
      });
      return _namespaces;
    }, new Set<string>());

    const countEmailByService = actions.hits
      .filter((action) => action._source!.action.actionTypeId === '.email')
      .reduce((emailServiceCount: Record<string, number>, action) => {
        const service = (action._source!.action.config?.service ?? 'other') as string;
        const currentCount =
          emailServiceCount[service] !== undefined ? emailServiceCount[service] : 0;
        emailServiceCount[service] = currentCount + 1;
        return emailServiceCount;
      }, {});

    let preconfiguredAlertHistoryConnectors = 0;

    const inMemoryActionsRefs = [
      ...Object.values(preconfiguredActionsAggs?.actionRefs ?? {}),
      ...Object.values(systemActionsAggs?.actionRefs ?? {}),
    ];

    for (const { actionRef, actionTypeId: rawActionTypeId } of inMemoryActionsRefs) {
      const actionTypeId = replaceFirstAndLastDotSymbols(rawActionTypeId);
      countByActionTypeId[actionTypeId] = countByActionTypeId[actionTypeId] || 0;
      countByActionTypeId[actionTypeId]++;

      if (actionRef === `preconfigured:${AlertHistoryEsIndexConnectorId}`) {
        preconfiguredAlertHistoryConnectors++;
      }

      if (inMemoryConnectors && actionTypeId === '__email') {
        const inMemoryConnectorId = actionRef.split(':')[1];
        const service = (inMemoryConnectors.find(
          (connector) => connector.id === inMemoryConnectorId
        )?.config?.service ?? 'other') as string;

        const currentCount =
          countEmailByService[service] !== undefined ? countEmailByService[service] : 0;

        countEmailByService[service] = currentCount + 1;
      }
    }

    return {
      hasErrors: false,
      countTotal: (aggs?.total ?? 0) + totalInMemoryActions,
      countByType: countByActionTypeId,
      countByAlertHistoryConnectorType: preconfiguredAlertHistoryConnectors,
      countEmailByService,
      countNamespaces: namespacesList.size,
    };
  } catch (err) {
    const errorMessage = err && err.message ? err.message : err.toString();

    logger.warn(
      `Error executing actions telemetry task: getInUseTotalCount - ${JSON.stringify(err)}`
    );
    return {
      hasErrors: true,
      errorMessage,
      countTotal: 0,
      countByType: {},
      countByAlertHistoryConnectorType: 0,
      countEmailByService: {},
      countNamespaces: 0,
    };
  }
}

export const getCounts = (aggs: Record<string, number>) => {
  const countGenAiProviderTypes: Record<string, number> = {};

  const countByType = Object.keys(aggs).reduce<Record<string, number>>((obj, key) => {
    const genAiKey = '.gen-ai';
    if (key.includes(genAiKey)) {
      const newKey = replaceFirstAndLastDotSymbols(genAiKey);
      if (obj[newKey] != null) {
        obj[newKey] = obj[newKey] + aggs[key];
      } else {
        obj[newKey] = aggs[key];
      }
      const genAiProvder = key.split(`${genAiKey}__`)[1];
      if (countGenAiProviderTypes[genAiProvder] != null) {
        countGenAiProviderTypes[genAiProvder] = obj[genAiProvder] + aggs[key];
      } else {
        countGenAiProviderTypes[genAiProvder] = aggs[key];
      }
      return obj;
    }
    obj[replaceFirstAndLastDotSymbols(key)] = aggs[key];
    return obj;
  }, {});

  return {
    countByType,
    countGenAiProviderTypes,
  };
};

export function replaceFirstAndLastDotSymbols(strToReplace: string) {
  const hasFirstSymbolDot = strToReplace.startsWith('.');
  const appliedString = hasFirstSymbolDot ? strToReplace.replace('.', '__') : strToReplace;
  const hasLastSymbolDot = strToReplace.endsWith('.');
  return hasLastSymbolDot ? `${appliedString.slice(0, -1)}__` : appliedString;
}

export async function getExecutionsPerDayCount(
  esClient: ElasticsearchClient,
  eventLogIndex: string,
  logger: Logger
): Promise<{
  hasErrors: boolean;
  errorMessage?: string;
  countTotal: number;
  countByType: Record<string, number>;
  countFailed: number;
  countFailedByType: Record<string, number>;
  avgExecutionTime: number;
  avgExecutionTimeByType: Record<string, number>;
  countRunOutcomeByConnectorType: Record<string, Record<string, number>>;
}> {
  const scriptedMetric = {
    scripted_metric: {
      init_script: 'state.connectorTypes = [:];  state.total = 0;',
      map_script: `
        if (doc['kibana.saved_objects.type'].value == 'action') {
          String connectorType = doc['kibana.saved_objects.type_id'].value;
          state.connectorTypes.put(connectorType, state.connectorTypes.containsKey(connectorType) ? state.connectorTypes.get(connectorType) + 1 : 1);
          state.total++;
        }
      `,
      // Combine script is executed per cluster, but we already have a key-value pair per cluster.
      // Despite docs that say this is optional, this script can't be blank.
      combine_script: 'return state',
      // Reduce script is executed across all clusters, so we need to add up all the total from each cluster
      // This also needs to account for having no data
      reduce_script: `
          Map connectorTypes = [:];
          long total = 0;
          for (state in states) {
            if (state !== null) {
              total += state.total;
              for (String k : state.connectorTypes.keySet()) {
                connectorTypes.put(k, connectorTypes.containsKey(k) ? connectorTypes.get(k) + state.connectorTypes.get(k) : state.connectorTypes.get(k));
              }
            }
          }
          Map result = new HashMap();
          result.total = total;
          result.connectorTypes = connectorTypes;
          return result;
      `,
    },
  };

  try {
    const actionResults = await esClient.search({
      index: eventLogIndex,
      size: 0,
      body: {
        query: {
          bool: {
            filter: {
              bool: {
                must: [
                  {
                    term: { 'event.action': 'execute' },
                  },
                  {
                    term: { 'event.provider': 'actions' },
                  },
                  {
                    range: {
                      '@timestamp': {
                        gte: 'now-1d',
                      },
                    },
                  },
                ],
              },
            },
          },
        },
        aggs: {
          totalExecutions: {
            nested: {
              path: 'kibana.saved_objects',
            },
            aggs: {
              byConnectorTypeId: scriptedMetric,
            },
          },
          failedExecutions: {
            filter: {
              bool: {
                filter: [
                  {
                    term: {
                      'event.outcome': 'failure',
                    },
                  },
                ],
              },
            },
            aggs: {
              refs: {
                nested: {
                  path: 'kibana.saved_objects',
                },
                aggs: {
                  byConnectorTypeId: scriptedMetric,
                },
              },
            },
          },
          avgDuration: { avg: { field: 'event.duration' } },
          avgDurationByType: {
            nested: {
              path: 'kibana.saved_objects',
            },
            aggs: {
              actionSavedObjects: {
                filter: { term: { 'kibana.saved_objects.type': 'action' } },
                aggs: {
                  byTypeId: {
                    terms: {
                      field: 'kibana.saved_objects.type_id',
                    },
                    aggs: {
                      refs: {
                        reverse_nested: {},
                        aggs: {
                          avgDuration: { avg: { field: 'event.duration' } },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          count_connector_types_by_action_run_outcome_per_day: {
            nested: {
              path: 'kibana.saved_objects',
            },
            aggs: {
              actionSavedObjects: {
                filter: { term: { 'kibana.saved_objects.type': 'action' } },
                aggs: {
                  connector_types: {
                    terms: {
                      field: 'kibana.saved_objects.type_id',
                    },
                    aggs: {
                      outcome: {
                        reverse_nested: {},
                        aggs: {
                          count: {
                            terms: {
                              field: 'event.outcome',
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    // @ts-expect-error aggegation type is not specified
    const aggsExecutions = actionResults.aggregations.totalExecutions?.byConnectorTypeId.value;
    // convert nanoseconds to milliseconds
    const aggsAvgExecutionTime = Math.round(
      // @ts-expect-error aggegation type is not specified
      actionResults.aggregations.avgDuration.value / (1000 * 1000)
    );
    const aggsFailedExecutions =
      // @ts-expect-error aggegation type is not specified
      actionResults.aggregations.failedExecutions?.refs?.byConnectorTypeId.value;

    const avgDurationByType =
      // @ts-expect-error aggegation type is not specified
      actionResults.aggregations.avgDurationByType?.actionSavedObjects?.byTypeId?.buckets;

    const avgExecutionTimeByType: Record<string, number> = avgDurationByType.reduce(
      // @ts-expect-error aggegation type is not specified
      (res: Record<string, number>, bucket) => {
        res[replaceFirstAndLastDotSymbols(bucket.key)] = bucket?.refs.avgDuration.value;
        return res;
      },
      {}
    );

    const aggsCountConnectorTypeByActionRun = actionResults.aggregations as {
      count_connector_types_by_action_run_outcome_per_day: {
        actionSavedObjects: {
          connector_types: AggregationsTermsAggregateBase<AvgActionRunOutcomeByConnectorTypeBucket>;
        };
      };
    };

    return {
      hasErrors: false,
      countTotal: aggsExecutions.total,
      countByType: Object.entries(aggsExecutions.connectorTypes).reduce(
        (res: Record<string, number>, [key, value]) => {
          // @ts-expect-error aggegation type is not specified
          res[replaceFirstAndLastDotSymbols(key)] = value;
          return res;
        },
        {}
      ),
      countFailed: aggsFailedExecutions.total,
      countFailedByType: Object.entries(aggsFailedExecutions.connectorTypes).reduce(
        (res: Record<string, number>, [key, value]) => {
          // @ts-expect-error aggegation type is not specified
          res[replaceFirstAndLastDotSymbols(key)] = value;
          return res;
        },
        {}
      ),
      avgExecutionTime: aggsAvgExecutionTime,
      avgExecutionTimeByType,
      countRunOutcomeByConnectorType: parseActionRunOutcomeByConnectorTypesBucket(
        aggsCountConnectorTypeByActionRun.count_connector_types_by_action_run_outcome_per_day
          .actionSavedObjects.connector_types.buckets
      ),
    };
  } catch (err) {
    const errorMessage = err && err.message ? err.message : err.toString();
    logger.warn(
      `Error executing actions telemetry task: getExecutionsPerDayCount - ${JSON.stringify(err)}`
    );
    return {
      hasErrors: true,
      errorMessage,
      countTotal: 0,
      countByType: {},
      countFailed: 0,
      countFailedByType: {},
      avgExecutionTime: 0,
      avgExecutionTimeByType: {},
      countRunOutcomeByConnectorType: {},
    };
  }
}
