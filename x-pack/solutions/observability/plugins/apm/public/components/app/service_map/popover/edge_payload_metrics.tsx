/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiDescriptionList } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { asDuration, asPercent, asTransactionRate } from '../../../../../common/utils/formatters';

export interface EdgePayloadMetrics {
  /** Error ratio, 0-1. */
  errorRate?: number;
  latencyMs?: number;
  throughputPerMin?: number;
}

export function hasEdgePayloadMetrics(
  metrics: EdgePayloadMetrics | undefined
): metrics is EdgePayloadMetrics {
  return (
    metrics !== undefined &&
    [metrics.errorRate, metrics.latencyMs, metrics.throughputPerMin].some(
      (value) => value !== undefined
    )
  );
}

/**
 * Edge metrics that arrived with the map's data, shown when the edge has no
 * exit-span resource to fetch live dependency stats for (e.g. service-to-service
 * edges in the Agent Builder attachment).
 */
export function EdgePayloadMetricsList({ metrics }: { metrics: EdgePayloadMetrics }) {
  const items = [
    {
      title: i18n.translate('xpack.apm.serviceMap.edgePayloadMetrics.latency', {
        defaultMessage: 'Latency (avg.)',
      }),
      // `asDuration` takes microseconds.
      description: asDuration(
        metrics.latencyMs === undefined ? undefined : metrics.latencyMs * 1000
      ),
      isShown: metrics.latencyMs !== undefined,
    },
    {
      title: i18n.translate('xpack.apm.serviceMap.edgePayloadMetrics.throughput', {
        defaultMessage: 'Throughput (avg.)',
      }),
      description: asTransactionRate(metrics.throughputPerMin),
      isShown: metrics.throughputPerMin !== undefined,
    },
    {
      title: i18n.translate('xpack.apm.serviceMap.edgePayloadMetrics.errorRate', {
        defaultMessage: 'Failed transaction rate (avg.)',
      }),
      description: asPercent(metrics.errorRate, 1),
      isShown: metrics.errorRate !== undefined,
    },
  ].filter(({ isShown }) => isShown);

  return (
    <EuiDescriptionList
      compressed
      type="column"
      listItems={items.map(({ title, description }) => ({ title, description }))}
      data-test-subj="apmServiceMapEdgePayloadMetrics"
    />
  );
}
