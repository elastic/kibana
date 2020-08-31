/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { pipe } from 'fp-ts/lib/pipeable';
import { useEffect } from 'react';
import { throwErrors, createPlainError } from '../../../../../common/runtime_types';
import { useHTTPRequest } from '../../../../hooks/use_http_request';
import {
  SnapshotNodeResponseRT,
  SnapshotNodeResponse,
  SnapshotGroupBy,
  SnapshotRequest,
  InfraTimerangeInput,
} from '../../../../../common/http_api/snapshot_api';
import {
  InventoryItemType,
  SnapshotMetricType,
} from '../../../../../common/inventory_models/types';

export function useSnapshot(
  filterQuery: string | null | undefined,
  metrics: Array<{ type: SnapshotMetricType }>,
  groupBy: SnapshotGroupBy,
  nodeType: InventoryItemType,
  sourceId: string,
  currentTime: number,
  accountId: string,
  region: string,
  sendRequestImmediatly = true
) {
  const decodeResponse = (response: any) => {
    return pipe(
      SnapshotNodeResponseRT.decode(response),
      fold(throwErrors(createPlainError), identity)
    );
  };

  const timerange: InfraTimerangeInput = {
    interval: '1m',
    to: currentTime,
    from: currentTime - 360 * 1000,
    lookbackSize: 20,
  };

  const { error, loading, response, makeRequest } = useHTTPRequest<SnapshotNodeResponse>(
    '/api/metrics/snapshot',
    'POST',
    JSON.stringify({
      metrics,
      groupBy,
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

  useEffect(() => {
    (async () => {
      if (sendRequestImmediatly) {
        await makeRequest();
      }
    })();
  }, [makeRequest, sendRequestImmediatly]);

  return {
    error: (error && error.message) || null,
    loading,
    nodes: response ? response.nodes : [],
    interval: response ? response.interval : '60s',
    reload: makeRequest,
  };
}
