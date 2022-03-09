/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { MonitoringCollectionSetup } from '../../../monitoring_collection/server';
import { NodeActionsMetric } from './types';
import { getAllInMemoryMetrics, IN_MEMORY_METRICS } from '.';

export function registerNodeCollector({
  monitoringCollection,
}: {
  monitoringCollection: MonitoringCollectionSetup;
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
    },
    fetch: async () => {
      const inMemoryMetrics = getAllInMemoryMetrics();

      const metrics: NodeActionsMetric = {
        failures: inMemoryMetrics[IN_MEMORY_METRICS.ACTION_FAILURES],
        executions: inMemoryMetrics[IN_MEMORY_METRICS.ACTION_EXECUTIONS],
      };

      return metrics;
    },
  });
}
