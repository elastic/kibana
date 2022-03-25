/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { MonitoringCollectionSetup } from '../../../monitoring_collection/server';
import { InMemoryMetrics, IN_MEMORY_METRICS } from '.';

export function registerNodeCollector({
  monitoringCollection,
  inMemoryMetrics,
}: {
  monitoringCollection: MonitoringCollectionSetup;
  inMemoryMetrics: InMemoryMetrics;
}) {
  monitoringCollection.registerMetric({
    type: 'node_actions',
    schema: {
      failures: {
        type: 'long',
      },
      executions: {
        type: 'long',
      },
      timeouts: {
        type: 'long',
      },
    },
    fetch: async () => {
      return {
        failures: inMemoryMetrics.getInMemoryMetric(IN_MEMORY_METRICS.ACTION_FAILURES),
        executions: inMemoryMetrics.getInMemoryMetric(IN_MEMORY_METRICS.ACTION_EXECUTIONS),
        timeouts: inMemoryMetrics.getInMemoryMetric(IN_MEMORY_METRICS.ACTION_TIMEOUTS),
      };
    },
  });
}
