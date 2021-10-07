/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EnterpriseSearchMetric } from './classes';
import { LARGE_BYTES } from '../../../../common/formatting';
import { i18n } from '@kbn/i18n';

export const metrics = {
  enterprise_search_heap_used: new EnterpriseSearchMetric({
    field: 'enterprisesearch.health.jvm.memory_usage.heap_used.bytes',
    metricAgg: 'max',
    label: i18n.translate('xpack.monitoring.metrics.entSearch.heap_used', {
      defaultMessage: 'Heap Used',
    }),
    description: i18n.translate('xpack.monitoring.metrics.entSearch.heap_used.description', {
      defaultMessage: 'Current amount of JVM Heam memory used by the application.',
    }),
    format: LARGE_BYTES,
    units: 'bytes',
  }),

  enterprise_search_heap_committed: new EnterpriseSearchMetric({
    field: 'enterprisesearch.health.jvm.memory_usage.heap_committed.bytes',
    metricAgg: 'max',
    label: i18n.translate('xpack.monitoring.metrics.entSearch.heap_committed', {
      defaultMessage: 'Heap Committed',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.enterpriseSearch.heap_committed.description',
      {
        defaultMessage:
          'The amount of memory JVM has allocated from the OS and is available to the application.',
      }
    ),
    format: LARGE_BYTES,
    units: 'bytes',
  }),

  enterprise_search_heap_total: new EnterpriseSearchMetric({
    field: 'enterprisesearch.health.jvm.memory_usage.heap_max.bytes',
    metricAgg: 'max',
    label: i18n.translate('xpack.monitoring.metrics.entSearch.heap_total', {
      defaultMessage: 'Heap Total',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.enterpriseSearch.heap_total.description',
      {
        defaultMessage: 'Maximum amount of JVM heap memory available to the application.',
      }
    ),
    format: LARGE_BYTES,
    units: 'bytes',
  }),
};
