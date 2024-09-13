/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InventoryItemType, InventoryMetric } from '@kbn/metrics-data-access-plugin/common';
import { BehaviorSubject } from 'rxjs';
import { decodeOrThrow } from '@kbn/io-ts-utils';
import { isPending, useFetcher } from '../../../hooks/use_fetcher';
import { InfraMetadataRT } from '../../../../common/http_api/metadata_api';
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
  const { data, status, error, refetch } = useFetcher(
    async (callApi) => {
      const response = await callApi('/api/infra/metadata', {
        method: 'POST',
        body: JSON.stringify({
          nodeId: assetId,
          nodeType: assetType,
          sourceId,
          timeRange,
        }),
      });
      return decodeOrThrow(InfraMetadataRT)(response);
    },
    [assetId, assetType, sourceId, timeRange],
    {
      requestObservable$: request$,
    }
  );

  return {
    name: (data && data.name) || '',
    filteredRequiredMetrics:
      data && requiredMetrics.length > 0 ? getFilteredMetrics(requiredMetrics, data.features) : [],
    error: (error && error.message) || null,
    loading: isPending(status),
    metadata: data,
    cloudId: data?.info?.cloud?.instance?.id || '',
    reload: refetch,
  };
}
