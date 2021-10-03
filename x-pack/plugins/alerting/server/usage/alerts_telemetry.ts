/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from 'kibana/server';
import { AlertsUsage } from './types';

const alertTypeMetric = {
  scripted_metric: {
    init_script: 'state.types = [:]',
    map_script: `
      String alertType = doc['alert.alertTypeId'].value;
      state.types.put(alertType, state.types.containsKey(alertType) ? state.types.get(alertType) + 1 : 1);
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

export async function getTotalCountAggregations(
  esClient: ElasticsearchClient,
  kibanaInex: string
): Promise<
  Pick<
    AlertsUsage,
    'count_total' | 'count_by_type' | 'throttle_time' | 'schedule_time' | 'connectors_per_alert'
  >
> {
  const throttleTimeMetric = {
    scripted_metric: {
      init_script: 'state.min = 0; state.max = 0; state.totalSum = 0; state.totalCount = 0;',
      map_script: `
        if (doc['alert.throttle'].size() > 0) {
          def throttle = doc['alert.throttle'].value;

          if (throttle.length() > 1) {
              // get last char
              String timeChar = throttle.substring(throttle.length() - 1);
              // remove last char
              throttle = throttle.substring(0, throttle.length() - 1);

              if (throttle.chars().allMatch(Character::isDigit)) {
                // using of regex is not allowed in painless language
                int parsed = Integer.parseInt(throttle);

                if (timeChar.equals("s")) {
                  parsed = parsed;
                } else if (timeChar.equals("m")) {
                  parsed = parsed * 60;
                } else if (timeChar.equals("h")) {
                  parsed = parsed * 60 * 60;
                } else if (timeChar.equals("d")) {
                  parsed = parsed * 24 * 60 * 60;
                }
                if (state.min === 0 || parsed < state.min) {
                  state.min = parsed;
                }
                if (parsed > state.max) {
                  state.max = parsed;
                }
                state.totalSum += parsed;
                state.totalCount++;
              }
          }
        }
      `,
      // Combine script is executed per cluster, but we already have a key-value pair per cluster.
      // Despite docs that say this is optional, this script can't be blank.
      combine_script: 'return state',
      // Reduce script is executed across all clusters, so we need to add up all the total from each cluster
      // This also needs to account for having no data
      reduce_script: `
        double min = 0;
        double max = 0;
        long totalSum = 0;
        long totalCount = 0;
        for (Map m : states.toArray()) {
          if (m !== null) {
            min = min > 0 ? Math.min(min, m.min) : m.min;
            max = Math.max(max, m.max);
            totalSum += m.totalSum;
            totalCount += m.totalCount;
          }
        }
        Map result = new HashMap();
        result.min = min;
        result.max = max;
        result.totalSum = totalSum;
        result.totalCount = totalCount;
        return result;
      `,
    },
  };

  const intervalTimeMetric = {
    scripted_metric: {
      init_script: 'state.min = 0; state.max = 0; state.totalSum = 0; state.totalCount = 0;',
      map_script: `
        if (doc['alert.schedule.interval'].size() > 0) {
          def interval = doc['alert.schedule.interval'].value;

          if (interval.length() > 1) {
              // get last char
              String timeChar = interval.substring(interval.length() - 1);
              // remove last char
              interval = interval.substring(0, interval.length() - 1);

              if (interval.chars().allMatch(Character::isDigit)) {
                // using of regex is not allowed in painless language
                int parsed = Integer.parseInt(interval);

                if (timeChar.equals("s")) {
                  parsed = parsed;
                } else if (timeChar.equals("m")) {
                  parsed = parsed * 60;
                } else if (timeChar.equals("h")) {
                  parsed = parsed * 60 * 60;
                } else if (timeChar.equals("d")) {
                  parsed = parsed * 24 * 60 * 60;
                }
                if (state.min === 0 || parsed < state.min) {
                  state.min = parsed;
                }
                if (parsed > state.max) {
                  state.max = parsed;
                }
                state.totalSum += parsed;
                state.totalCount++;
              }
          }
        }
      `,
      // Combine script is executed per cluster, but we already have a key-value pair per cluster.
      // Despite docs that say this is optional, this script can't be blank.
      combine_script: 'return state',
      // Reduce script is executed across all clusters, so we need to add up all the total from each cluster
      // This also needs to account for having no data
      reduce_script: `
        double min = 0;
        double max = 0;
        long totalSum = 0;
        long totalCount = 0;
        for (Map m : states.toArray()) {
          if (m !== null) {
            min = min > 0 ? Math.min(min, m.min) : m.min;
            max = Math.max(max, m.max);
            totalSum += m.totalSum;
            totalCount += m.totalCount;
          }
        }
        Map result = new HashMap();
        result.min = min;
        result.max = max;
        result.totalSum = totalSum;
        result.totalCount = totalCount;
        return result;
      `,
    },
  };

  const connectorsMetric = {
    scripted_metric: {
      init_script:
        'state.currentAlertActions = 0; state.min = 0; state.max = 0; state.totalActionsCount = 0;',
      map_script: `
        String refName = doc['alert.actions.actionRef'].value;
        if (refName == 'action_0') {
          if (state.currentAlertActions !== 0 && state.currentAlertActions < state.min) {
            state.min = state.currentAlertActions;
          }
          if (state.currentAlertActions !== 0 && state.currentAlertActions > state.max) {
            state.max = state.currentAlertActions;
          }
          state.currentAlertActions = 1;
        } else {
          state.currentAlertActions++;
        }
        state.totalActionsCount++;
      `,
      // Combine script is executed per cluster, but we already have a key-value pair per cluster.
      // Despite docs that say this is optional, this script can't be blank.
      combine_script: 'return state',
      // Reduce script is executed across all clusters, so we need to add up all the total from each cluster
      // This also needs to account for having no data
      reduce_script: `
        double min = 0;
        double max = 0;
        long totalActionsCount = 0;
        long currentAlertActions = 0;
        for (Map m : states.toArray()) {
          if (m !== null) {
            min = min > 0 ? Math.min(min, m.min) : m.min;
            max = Math.max(max, m.max);
            currentAlertActions += m.currentAlertActions;
            totalActionsCount += m.totalActionsCount;
          }
        }
        Map result = new HashMap();
        result.min = min;
        result.max = max;
        result.currentAlertActions = currentAlertActions;
        result.totalActionsCount = totalActionsCount;
        return result;
      `,
    },
  };

  const { body: results } = await esClient.search({
    index: kibanaInex,
    body: {
      query: {
        bool: {
          filter: [{ term: { type: 'alert' } }],
        },
      },
      aggs: {
        byAlertTypeId: alertTypeMetric,
        throttleTime: throttleTimeMetric,
        intervalTime: intervalTimeMetric,
        connectorsAgg: {
          nested: {
            path: 'alert.actions',
          },
          aggs: {
            connectors: connectorsMetric,
          },
        },
      },
    },
  });

  const aggregations = results.aggregations as {
    byAlertTypeId: { value: { types: Record<string, string> } };
    throttleTime: { value: { min: number; max: number; totalCount: number; totalSum: number } };
    intervalTime: { value: { min: number; max: number; totalCount: number; totalSum: number } };
    connectorsAgg: {
      connectors: {
        value: { min: number; max: number; totalActionsCount: number; totalAlertsCount: number };
      };
    };
  };

  const totalAlertsCount = Object.keys(aggregations.byAlertTypeId.value.types).reduce(
    (total: number, key: string) =>
      parseInt(aggregations.byAlertTypeId.value.types[key], 10) + total,
    0
  );

  return {
    count_total: totalAlertsCount,
    count_by_type: Object.keys(aggregations.byAlertTypeId.value.types).reduce(
      // ES DSL aggregations are returned as `any` by esClient.search
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (obj: any, key: string) => ({
        ...obj,
        [replaceFirstAndLastDotSymbols(key)]: aggregations.byAlertTypeId.value.types[key],
      }),
      {}
    ),
    throttle_time: {
      min: `${aggregations.throttleTime.value.min}s`,
      avg: `${
        aggregations.throttleTime.value.totalCount > 0
          ? aggregations.throttleTime.value.totalSum / aggregations.throttleTime.value.totalCount
          : 0
      }s`,
      max: `${aggregations.throttleTime.value.max}s`,
    },
    schedule_time: {
      min: `${aggregations.intervalTime.value.min}s`,
      avg: `${
        aggregations.intervalTime.value.totalCount > 0
          ? aggregations.intervalTime.value.totalSum / aggregations.intervalTime.value.totalCount
          : 0
      }s`,
      max: `${aggregations.intervalTime.value.max}s`,
    },
    connectors_per_alert: {
      min: aggregations.connectorsAgg.connectors.value.min,
      avg:
        totalAlertsCount > 0
          ? aggregations.connectorsAgg.connectors.value.totalActionsCount / totalAlertsCount
          : 0,
      max: aggregations.connectorsAgg.connectors.value.max,
    },
  };
}

export async function getTotalCountInUse(esClient: ElasticsearchClient, kibanaInex: string) {
  const { body: searchResult } = await esClient.search({
    index: kibanaInex,
    body: {
      query: {
        bool: {
          filter: [{ term: { type: 'alert' } }, { term: { 'alert.enabled': true } }],
        },
      },
      aggs: {
        byAlertTypeId: alertTypeMetric,
      },
    },
  });

  const aggregations = searchResult.aggregations as {
    byAlertTypeId: { value: { types: Record<string, string> } };
  };

  return {
    countTotal: Object.keys(aggregations.byAlertTypeId.value.types).reduce(
      (total: number, key: string) =>
        parseInt(aggregations.byAlertTypeId.value.types[key], 10) + total,
      0
    ),
    countByType: Object.keys(aggregations.byAlertTypeId.value.types).reduce(
      // ES DSL aggregations are returned as `any` by esClient.search
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (obj: any, key: string) => ({
        ...obj,
        [replaceFirstAndLastDotSymbols(key)]: aggregations.byAlertTypeId.value.types[key],
      }),
      {}
    ),
  };
}

function replaceFirstAndLastDotSymbols(strToReplace: string) {
  const hasFirstSymbolDot = strToReplace.startsWith('.');
  const appliedString = hasFirstSymbolDot ? strToReplace.replace('.', '__') : strToReplace;
  const hasLastSymbolDot = strToReplace.endsWith('.');
  return hasLastSymbolDot ? `${appliedString.slice(0, -1)}__` : appliedString;
}

// TODO: Implement executions count telemetry with eventLog, when it will write to index
