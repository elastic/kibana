/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useFetcher } from './use_fetcher';
import { getDataHandler } from '../data_handler';

export function useApmHasData() {
  return useFetcher(() => getDataHandler('apm')?.hasData(), []);
}

export function useInfraLogsHasData() {
  return useFetcher(() => getDataHandler('infra_logs')?.hasData(), []);
}

export function useInfraMetricsHasData() {
  return useFetcher(() => getDataHandler('infra_metrics')?.hasData(), []);
}

export function useUptimeHasData() {
  return useFetcher(() => getDataHandler('uptime')?.hasData(), []);
}

export function useUxHasData({ start, end }: { start: number; end: number }) {
  return useFetcher(
    () => getDataHandler('ux')?.hasData({ absoluteTime: { start, end } }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
}
