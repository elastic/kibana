/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/api/types';
import { ElasticsearchClient } from 'kibana/server';
import { AlertHistoryEsIndexConnectorId } from '../../common';
import { ActionResult, PreConfiguredAction } from '../types';

export async function getTotalCount(
  esClient: ElasticsearchClient,
  kibanaIndex: string,
  preconfiguredActions?: PreConfiguredAction[]
) {
  const scriptedMetric = {
    scripted_metric: {
      init_script: 'state.types = [:]',
      map_script: `
        String actionType = doc['action.actionTypeId'].value;
        state.types.put(actionType, state.types.containsKey(actionType) ? state.types.get(actionType) + 1 : 1);
      `,
      // Combine script is executed per cluster, but we already have a key-value pair per cluster.
      // Despite docs that say this is optional, this script can't be blank.
      combine_script: 'return state',
      // Reduce script is executed across all clusters, so we need to add up all the total from each cluster
      // This also needs to account for having no data
      reduce_script: `
        Map result = [:];
        for (Map m : states.toArray()) {
          if (m !== null) {
            for (String k : m.keySet()) {
              result.put(k, result.containsKey(k) ? result.get(k) + m.get(k) : m.get(k));
            }
          }
        }
        return result;
      `,
    },
  };

  const { body: searchResult } = await esClient.search({
    index: kibanaIndex,
    size: 0,
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
  // @ts-expect-error aggegation type is not specified
  const aggs = searchResult.aggregations?.byActionTypeId.value?.types;
  const countByType = Object.keys(aggs).reduce(
    // ES DSL aggregations are returned as `any` by esClient.search
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (obj: any, key: string) => ({
      ...obj,
      [replaceFirstAndLastDotSymbols(key)]: aggs[key],
    }),
    {}
  );
  if (preconfiguredActions && preconfiguredActions.length) {
    for (const preconfiguredAction of preconfiguredActions) {
      const actionTypeId = replaceFirstAndLastDotSymbols(preconfiguredAction.actionTypeId);
      countByType[actionTypeId] = countByType[actionTypeId] || 0;
      countByType[actionTypeId]++;
    }
  }
  return {
    countTotal:
      Object.keys(aggs).reduce((total: number, key: string) => parseInt(aggs[key], 10) + total, 0) +
      (preconfiguredActions?.length ?? 0),
    countByType,
  };
}

export async function getInUseTotalCount(
  esClient: ElasticsearchClient,
  kibanaIndex: string,
  referenceType?: string,
  preconfiguredActions?: PreConfiguredAction[]
): Promise<{
  countTotal: number;
  countByType: Record<string, number>;
  countByAlertHistoryConnectorType: number;
  countEmailByService: Record<string, number>;
  countNamespaces: number;
}> {
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

  const preconfiguredActionsScriptedMetric = {
    scripted_metric: {
      init_script: 'state.actionRefs = new HashMap(); state.total = 0;',
      map_script: `
        String actionRef = doc['alert.actions.actionRef'].value;
        String actionTypeId = doc['alert.actions.actionTypeId'].value;
        if (actionRef.startsWith('preconfigured:') && state.actionRefs[actionRef] === null) {
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
  };

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
        ],
      },
    },
  ] as QueryDslQueryContainer[];

  if (!!referenceType) {
    mustQuery.push({
      term: { type: referenceType },
    });
  }

  const { body: actionResults } = await esClient.search({
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
      },
    },
  });

  // @ts-expect-error aggegation type is not specified
  const aggs = actionResults.aggregations.refs.actionRefIds.value;
  const preconfiguredActionsAggs =
    // @ts-expect-error aggegation type is not specified
    actionResults.aggregations.preconfigured_actions?.preconfiguredActionRefIds.value;

  const {
    body: { hits: actions },
  } = await esClient.search<{
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
                _id: Object.entries(aggs.connectorIds).map(([key]) => `action:${key}`),
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
  const preconfiguredActionsRefs: Array<{
    actionTypeId: string;
    actionRef: string;
  }> = preconfiguredActionsAggs ? Object.values(preconfiguredActionsAggs?.actionRefs) : [];
  for (const { actionRef, actionTypeId: rawActionTypeId } of preconfiguredActionsRefs) {
    const actionTypeId = replaceFirstAndLastDotSymbols(rawActionTypeId);
    countByActionTypeId[actionTypeId] = countByActionTypeId[actionTypeId] || 0;
    countByActionTypeId[actionTypeId]++;
    if (actionRef === `preconfigured:${AlertHistoryEsIndexConnectorId}`) {
      preconfiguredAlertHistoryConnectors++;
    }
    if (preconfiguredActions && actionTypeId === '__email') {
      const preconfiguredConnectorId = actionRef.split(':')[1];
      const service = (preconfiguredActions.find(
        (preconfConnector) => preconfConnector.id === preconfiguredConnectorId
      )?.config?.service ?? 'other') as string;
      const currentCount =
        countEmailByService[service] !== undefined ? countEmailByService[service] : 0;
      countEmailByService[service] = currentCount + 1;
    }
  }

  return {
    countTotal: aggs.total + (preconfiguredActionsAggs?.total ?? 0),
    countByType: countByActionTypeId,
    countByAlertHistoryConnectorType: preconfiguredAlertHistoryConnectors,
    countEmailByService,
    countNamespaces: namespacesList.size,
  };
}

export async function getInUseByAlertingTotalCounts(
  esClient: ElasticsearchClient,
  kibanaIndex: string,
  preconfiguredActions?: PreConfiguredAction[]
): Promise<{
  countTotal: number;
  countByType: Record<string, number>;
  countByAlertHistoryConnectorType: number;
  countEmailByService: Record<string, number>;
  countNamespaces: number;
}> {
  return await getInUseTotalCount(esClient, kibanaIndex, 'alert', preconfiguredActions);
}

function replaceFirstAndLastDotSymbols(strToReplace: string) {
  const hasFirstSymbolDot = strToReplace.startsWith('.');
  const appliedString = hasFirstSymbolDot ? strToReplace.replace('.', '__') : strToReplace;
  const hasLastSymbolDot = strToReplace.endsWith('.');
  return hasLastSymbolDot ? `${appliedString.slice(0, -1)}__` : appliedString;
}

// TODO: Implement executions count telemetry with eventLog, when it will write to index
