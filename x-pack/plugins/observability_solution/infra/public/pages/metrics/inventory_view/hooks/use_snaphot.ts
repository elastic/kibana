/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { pipe } from 'fp-ts/lib/pipeable';
import { useEffect } from 'react';
import { throwErrors, createPlainError } from '../../../../../common/runtime_types';
import { useHTTPRequest } from '../../../../hooks/use_http_request';
import {
  InfraTimerangeInput,
  SnapshotNodeResponseRT,
  SnapshotRequest,
} from '../../../../../common/http_api/snapshot_api';

export interface UseSnapshotRequest
  extends Omit<SnapshotRequest, 'filterQuery' | 'timerange' | 'includeTimeseries'> {
  filterQuery: string | null | symbol | undefined;
  currentTime: number;
  sendRequestImmediately?: boolean;
  includeTimeseries?: boolean;
  timerange?: InfraTimerangeInput;
  requestTs?: number;
}

export interface UseSnapshotRequestOptions {
  abortable?: boolean;
}

export function useSnapshot(
  {
    timerange,
    currentTime,
    accountId = '',
    region = '',
    groupBy = null,
    sendRequestImmediately = true,
    includeTimeseries = true,
    dropPartialBuckets = true,
    requestTs,
    ...args
  }: UseSnapshotRequest,
  options?: UseSnapshotRequestOptions
) {
  const decodeResponse = (response: any) => {
    return pipe(
      SnapshotNodeResponseRT.decode(response),
      fold(throwErrors(createPlainError), identity)
    );
  };

  const payload: Omit<SnapshotRequest, 'filterQuery'> = {
    ...args,
    accountId,
    region,
    groupBy,
    timerange: timerange ?? {
      interval: '1m',
      to: currentTime,
      from: currentTime - 1200 * 1000,
      lookbackSize: 5,
    },
    includeTimeseries,
    dropPartialBuckets,
  };

  const { error, loading, response, makeRequest, resetRequestState } = useHTTPRequest(
    '/api/metrics/snapshot',
    'POST',
    JSON.stringify(payload),
    decodeResponse,
    undefined,
    undefined,
    options?.abortable
  );

  useEffect(() => {
    if (sendRequestImmediately) {
      makeRequest();
    }
    return () => {
      resetRequestState();
    };
  }, [makeRequest, sendRequestImmediately, resetRequestState, requestTs]);

  return {
    error: (error && error.message) || null,
    loading,
    nodes: response ? response.nodes : [],
    interval: response ? response.interval : '60s',
    reload: makeRequest,
  };
}
