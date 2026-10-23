/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ENVIRONMENT_NOT_DEFINED,
  getNextEnvironmentUrlParam,
} from '../../../../common/environment_filter_values';
import { LatencyAggregationType } from '../../../../common/latency_aggregation_types';
import { useAnyOfApmParams } from '../../../hooks/use_apm_params';

/**
 * Resolves the query params shared by the service and transaction links in the waterfall item
 * flyout headers. `serviceEnvironment` is the environment of the service the links point to.
 */
export function useWaterfallItemLinkParams(serviceEnvironment: string | undefined) {
  const { query } = useAnyOfApmParams(
    '/services/{serviceName}/transactions/view',
    '/mobile-services/{serviceName}/transactions/view',
    '/dependencies/operation'
  );

  const latencyAggregationType =
    ('latencyAggregationType' in query && query.latencyAggregationType) ||
    LatencyAggregationType.avg;
  const serviceGroup = ('serviceGroup' in query && query.serviceGroup) || '';
  const nextEnvironment = getNextEnvironmentUrlParam({
    requestedEnvironment: serviceEnvironment ?? ENVIRONMENT_NOT_DEFINED.value,
    currentEnvironmentUrlParam: query.environment,
  });

  return { query, latencyAggregationType, serviceGroup, nextEnvironment };
}
