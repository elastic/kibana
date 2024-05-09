/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { pipe } from 'fp-ts/lib/pipeable';
import type { InventoryItemType, InventoryMetric } from '@kbn/metrics-data-access-plugin/common';
import { BehaviorSubject } from 'rxjs';
import { useHTTPRequest } from '../../../hooks/use_http_request';
import { type InfraMetadata, InfraMetadataRT } from '../../../../common/http_api/metadata_api';
import { throwErrors, createPlainError } from '../../../../common/runtime_types';
import { getFilteredMetrics } from '../../../pages/metrics/metric_detail/lib/get_filtered_metrics';

interface UseMetadataProps {
  assetId: string;
  assetType: InventoryItemType;
  requiredMetrics?: InventoryMetric[];
  sourceId: string;
  timeRange: {
    from: number;
    to: number;
  };
  request$?: BehaviorSubject<(() => Promise<unknown>) | undefined>;
}
export function useMetadata({
  assetId,
  assetType,
  sourceId,
  timeRange,
  requiredMetrics = [],
  request$,
}: UseMetadataProps) {
  const decodeResponse = (response: any) => {
    return pipe(InfraMetadataRT.decode(response), fold(throwErrors(createPlainError), identity));
  };

  const { error, loading, response, makeRequest } = useHTTPRequest<InfraMetadata>(
    '/api/infra/metadata',
    'POST',
    JSON.stringify({
      nodeId: assetId,
      nodeType: assetType,
      sourceId,
      timeRange,
    }),
    decodeResponse,
    undefined,
    undefined,
    true
  );

  useEffect(() => {
    if (request$) {
      request$.next(makeRequest);
    } else {
      makeRequest();
    }
  }, [makeRequest, request$]);

  return {
    name: (response && response.name) || '',
    filteredRequiredMetrics:
      response && requiredMetrics.length > 0
        ? getFilteredMetrics(requiredMetrics, response.features)
        : [],
    error: (error && error.message) || null,
    loading,
    metadata: response,
    cloudId: response?.info?.cloud?.instance?.id || '',
    reload: makeRequest,
  };
}
