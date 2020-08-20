/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { SnapshotCustomMetricInput } from '../http_api/snapshot_api';

export const getCustomMetricLabel = (metric: SnapshotCustomMetricInput) => {
  const METRIC_LABELS = {
    avg: i18n.translate('xpack.infra.waffle.aggregationNames.avg', {
      defaultMessage: 'Avg of {field}',
      values: { field: metric.field },
    }),
    max: i18n.translate('xpack.infra.waffle.aggregationNames.max', {
      defaultMessage: 'Max of {field}',
      values: { field: metric.field },
    }),
    min: i18n.translate('xpack.infra.waffle.aggregationNames.min', {
      defaultMessage: 'Min of {field}',
      values: { field: metric.field },
    }),
    rate: i18n.translate('xpack.infra.waffle.aggregationNames.rate', {
      defaultMessage: 'Rate of {field}',
      values: { field: metric.field },
    }),
  };
  return metric.label ? metric.label : METRIC_LABELS[metric.aggregation];
};
