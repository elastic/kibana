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
  enterprise_search_cluster_heap_used: new EnterpriseSearchMetric({
    field: 'enterprisesearch.health.jvm.memory_usage.heap_committed.bytes',
    label: i18n.translate('xpack.monitoring.metrics.enterpriseSearch.heap_used', {
      defaultMessage: 'Heap Used',
    }),
    description: i18n.translate('xpack.monitoring.metrics.enterpriseSearch.heap_used.description', {
      defaultMessage: 'Heap Used description.',
    }),
    format: LARGE_BYTES,
    units: '',
  }),
  enterprise_search_cluster_heap_max: new EnterpriseSearchMetric({
    field: 'enterprisesearch.health.jvm.memory_usage.heap_committed.bytes',
    label: i18n.translate('xpack.monitoring.metrics.enterpriseSearch.heap_max', {
      defaultMessage: 'Heap max',
    }),
    description: i18n.translate('xpack.monitoring.metrics.enterpriseSearch.heap_max.description', {
      defaultMessage: 'Heap max description.',
    }),
    format: LARGE_BYTES,
    units: '',
  }),
};
