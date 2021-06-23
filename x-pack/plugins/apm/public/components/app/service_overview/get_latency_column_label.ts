/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { LatencyAggregationType } from '../../../../common/latency_aggregation_types';

export function getLatencyColumnLabel(
  latencyAggregationType?: LatencyAggregationType
) {
  switch (latencyAggregationType) {
    case LatencyAggregationType.avg:
      return i18n.translate('xpack.apm.serviceOverview.latencyColumnAvgLabel', {
        defaultMessage: 'Latency (avg.)',
      });

    case LatencyAggregationType.p95:
      return i18n.translate('xpack.apm.serviceOverview.latencyColumnP95Label', {
        defaultMessage: 'Latency (95th)',
      });

    case LatencyAggregationType.p99:
      return i18n.translate('xpack.apm.serviceOverview.latencyColumnP99Label', {
        defaultMessage: 'Latency (99th)',
      });

    default:
      return i18n.translate(
        'xpack.apm.serviceOverview.latencyColumnDefaultLabel',
        {
          defaultMessage: 'Latency',
        }
      );
  }
}
