/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compact, isEmpty, uniq } from 'lodash';
import { asMutableArray } from '../../../../common/utils/as_mutable_array';
import { joinByKey } from '../../../../common/utils/join_by_key';

export function mergeEntities({ entities }) {
  return joinByKey(entities, 'name', function merge(item, current) {
    const environments = item?.environments ?? [];
    const currentEnvironments = current.environments ?? [];

    const itemsDataStream = item?.data_stream?.type ?? [];
    const currentDataStream = current.data_stream.type ?? [];

    const itemsMetric = item?.entity?.metric ?? [];
    const currentMetric = current.entity.metric ?? [];

    console.log('currentEnvironment', current);
    if (isEmpty(item)) {
      return {
        name: current.name,
        data_stream: { type: currentDataStream },
        agent: {
          name: current.agent.name,
        },
        environments: currentEnvironments ? [currentEnvironments] : [],
        entity: {
          // TODO rename to metrics
          metric: {
            logRatePerMinute: [currentMetric.logRatePerMinute],
            logErrorRate: [currentMetric.logErrorRate],
            failedTransactionRate: [currentMetric.failedTransactionRate],
            latency: [currentMetric.latency],
            throughput: [currentMetric.throughput],
          },
        },
      };
    }
    return {
      name: current.name,
      data_stream: { type: uniq([...itemsDataStream, ...currentDataStream]) },
      agent: {
        name: current.agent.name,
      },
      environments: uniq(compact([].concat(...environments, currentEnvironments))),
      entity: {
        // TODO rename to metrics
        metric: {
          logRatePerMinute: [].concat(itemsMetric.logRatePerMinute, currentMetric.logRatePerMinute),
          logErrorRate: [].concat(itemsMetric.logErrorRate, currentMetric.logErrorRate),
          failedTransactionRate: [].concat(
            itemsMetric.failedTransactionRate,
            currentMetric.failedTransactionRate
          ),
          latency: [].concat(itemsMetric.latency, currentMetric.latency),
          throughput: [].concat(itemsMetric.throughput, currentMetric.throughput),
        },
      },
    };
  });
}
