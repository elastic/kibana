/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FETCH_STATUS, FetcherResult, useFetcher } from './use_fetcher';
import { getDataHandler } from '../data_handler';

function parseResult(result: FetcherResult<boolean>) {
  if (result.status === FETCH_STATUS.FAILURE) {
    return { ...result, data: false };
  }
  return result;
}

export function useApmHasData() {
  const result = useFetcher(() => getDataHandler('apm')?.hasData(), []);
  return parseResult(result);
}

export function useInfraLogsHasData() {
  const result = useFetcher(() => getDataHandler('infra_logs')?.hasData(), []);

  return parseResult(result);
}

export function useInfraMetricsHasData() {
  const result = useFetcher(() => getDataHandler('infra_metrics')?.hasData(), []);
  return parseResult(result);
}

export function useUptimeHasData() {
  const result = useFetcher(() => getDataHandler('uptime')?.hasData(), []);
  return parseResult(result);
}
