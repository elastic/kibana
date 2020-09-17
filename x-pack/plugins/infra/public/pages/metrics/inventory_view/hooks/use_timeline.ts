/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { pipe } from 'fp-ts/lib/pipeable';
import { first } from 'lodash';
import { useEffect, useMemo, useCallback } from 'react';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { getIntervalInSeconds } from '../../../../../server/utils/get_interval_in_seconds';
import { throwErrors, createPlainError } from '../../../../../common/runtime_types';
import { useHTTPRequest } from '../../../../hooks/use_http_request';
import {
  SnapshotNodeResponseRT,
  SnapshotNodeResponse,
  SnapshotRequest,
  InfraTimerangeInput,
} from '../../../../../common/http_api/snapshot_api';
import {
  InventoryItemType,
  SnapshotMetricType,
} from '../../../../../common/inventory_models/types';

const ONE_MINUTE = 60;
const ONE_HOUR = ONE_MINUTE * 60;
const ONE_DAY = ONE_HOUR * 24;
const ONE_WEEK = ONE_DAY * 7;

const getTimeLengthFromInterval = (interval: string | undefined) => {
  if (interval) {
    const intervalInSeconds = getIntervalInSeconds(interval);
    const multiplier =
      intervalInSeconds < ONE_MINUTE
        ? ONE_HOUR / intervalInSeconds
        : intervalInSeconds < ONE_HOUR
        ? 60
        : intervalInSeconds < ONE_DAY
        ? 7
        : intervalInSeconds < ONE_WEEK
        ? 30
        : 1;
    const timeLength = intervalInSeconds * multiplier;
    return { timeLength, intervalInSeconds, lookbackSize: Math.max(6, multiplier) };
  } else {
    return { timeLength: 0, lookbackSize: 0, intervalInSeconds: 0 };
  }
};

export function useTimeline(
  filterQuery: string | null | undefined,
  metrics: Array<{ type: SnapshotMetricType }>,
  nodeType: InventoryItemType,
  sourceId: string,
  currentTime: number,
  accountId: string,
  region: string,
  interval: string | undefined,
  shouldReload: boolean
) {
  const decodeResponse = (response: any) => {
    return pipe(
      SnapshotNodeResponseRT.decode(response),
      fold(throwErrors(createPlainError), identity)
    );
  };

  const timeLengthResult = useMemo(() => getTimeLengthFromInterval(interval), [interval]);
  const { timeLength, lookbackSize, intervalInSeconds } = timeLengthResult;

  const timerange: InfraTimerangeInput = {
    interval: interval ?? '',
    to: currentTime + intervalInSeconds * 1000,
    from: currentTime - timeLength * 1000,
    lookbackSize,
  };

  const { error, loading, response, makeRequest } = useHTTPRequest<SnapshotNodeResponse>(
    '/api/metrics/snapshot',
    'POST',
    JSON.stringify({
      metrics,
      groupBy: null,
      nodeType,
      timerange,
      filterQuery,
      sourceId,
      accountId,
      region,
      includeTimeseries: true,
    } as SnapshotRequest),
    decodeResponse
  );

  const loadData = useCallback(() => {
    if (shouldReload) return makeRequest();
    return Promise.resolve();
  }, [makeRequest, shouldReload]);

  useEffect(() => {
    (async () => {
      if (timeLength) {
        await loadData();
      }
    })();
  }, [loadData, timeLength]);

  const timeseries = response
    ? first(response.nodes.map((node) => first(node.metrics)?.timeseries))
    : null;

  return {
    error: (error && error.message) || null,
    loading: !interval ? true : loading,
    timeseries,
    reload: makeRequest,
  };
}
