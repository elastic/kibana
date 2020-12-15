/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LatencyAggregationType } from '../../common/latency_aggregation_types';
import { useUrlParams } from '../context/url_params_context/use_url_params';

export function useLatencyAggregationType(): LatencyAggregationType {
  const {
    urlParams: { latencyAggregationType },
  } = useUrlParams();

  if (!latencyAggregationType) {
    return LatencyAggregationType.avg;
  }

  if (latencyAggregationType in LatencyAggregationType) {
    return latencyAggregationType as LatencyAggregationType;
  }

  return LatencyAggregationType.avg;
}
