/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  LegacyAPICaller,
  SavedObjectsBaseOptions,
  SavedObjectsBulkGetObject,
  SavedObjectsBulkResponse,
} from 'kibana/server';
import { ActionResult } from '../types';

export async function getTotalCount(callCluster: LegacyAPICaller, kibanaIndex: string) {
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

  const searchResult = await callCluster('search', {
    index: kibanaIndex,
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

  return {
    countTotal: Object.keys(searchResult.aggregations.byActionTypeId.value.types).reduce(
      (total: number, key: string) =>
        parseInt(searchResult.aggregations.byActionTypeId.value.types[key], 0) + total,
      0
    ),
    countByType: Object.keys(searchResult.aggregations.byActionTypeId.value.types).reduce(
      // ES DSL aggregations are returned as `any` by callCluster
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (obj: any, key: string) => ({
        ...obj,
        [replaceFirstAndLastDotSymbols(key)]: searchResult.aggregations.byActionTypeId.value.types[
          key
        ],
      }),
      {}
    ),
  };
}

export async function getInUseTotalCount(
  callCluster: LegacyAPICaller,
  actionsBulkGet: (
    objects?: SavedObjectsBulkGetObject[] | undefined,
    options?: SavedObjectsBaseOptions | undefined
  ) => Promise<SavedObjectsBulkResponse<ActionResult<Record<string, unknown>>>>,
  kibanaIndex: string
): Promise<{ countTotal: number; countByType: Record<string, number> }> {
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

  const actionResults = await callCluster('search', {
    index: kibanaIndex,
    body: {
      query: {
        bool: {
          filter: {
            bool: {
              must: {
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
      },
    },
  });

  const bulkFilter = Object.entries(
    actionResults.aggregations.refs.actionRefIds.value.connectorIds
  ).map(([key]) => ({
    id: key,
    type: 'action',
    fields: ['id', 'actionTypeId'],
  }));
  const actions = await actionsBulkGet(bulkFilter);
  const countByType = actions.saved_objects.reduce(
    (actionTypeCount: Record<string, number>, action) => {
      const alertTypeId = replaceFirstAndLastDotSymbols(action.attributes.actionTypeId);
      const currentCount =
        actionTypeCount[alertTypeId] !== undefined ? actionTypeCount[alertTypeId] : 0;
      actionTypeCount[alertTypeId] = currentCount + 1;
      return actionTypeCount;
    },
    {}
  );
  return { countTotal: actionResults.aggregations.refs.actionRefIds.value.total, countByType };
}

function replaceFirstAndLastDotSymbols(strToReplace: string) {
  const hasFirstSymbolDot = strToReplace.startsWith('.');
  const appliedString = hasFirstSymbolDot ? strToReplace.replace('.', '__') : strToReplace;
  const hasLastSymbolDot = strToReplace.endsWith('.');
  return hasLastSymbolDot ? `${appliedString.slice(0, -1)}__` : appliedString;
}

// TODO: Implement executions count telemetry with eventLog, when it will write to index
