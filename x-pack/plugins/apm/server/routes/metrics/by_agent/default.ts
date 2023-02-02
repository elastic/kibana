/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APMConfig } from '../../..';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import { getCPUChartData } from './shared/cpu';
import { getMemoryChartData } from './shared/memory';

export function getDefaultMetricsCharts({
  environment,
  kuery,
  serviceName,
  config,
  apmEventClient,
  start,
  end,
}: {
  environment: string;
  kuery: string;
  serviceName: string;
  config: APMConfig;
  apmEventClient: APMEventClient;
  start: number;
  end: number;
}) {
  return Promise.all([
    getCPUChartData({
      environment,
      kuery,
      config,
      apmEventClient,
      serviceName,
      start,
      end,
    }),
    getMemoryChartData({
      environment,
      kuery,
      config,
      apmEventClient,
      serviceName,
      start,
      end,
    }),
  ]);
}
