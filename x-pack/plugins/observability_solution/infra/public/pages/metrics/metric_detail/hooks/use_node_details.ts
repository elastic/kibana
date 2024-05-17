/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InventoryItemType, InventoryMetric } from '@kbn/metrics-data-access-plugin/common';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { pipe } from 'fp-ts/lib/pipeable';
import {
  NodeDetailsMetricDataResponse,
  NodeDetailsMetricDataResponseRT,
} from '../../../../../common/http_api/node_details_api';
import { InfraTimerangeInput } from '../../../../../common/http_api/snapshot_api';
import { createPlainError, throwErrors } from '../../../../../common/runtime_types';
import { useHTTPRequest } from '../../../../hooks/use_http_request';

export function useNodeDetails(
  metrics: InventoryMetric[],
  nodeId: string,
  nodeType: InventoryItemType,
  sourceId: string,
  timerange: InfraTimerangeInput,
  cloudId: string
) {
  const decodeResponse = (response: any) => {
    return pipe(
      NodeDetailsMetricDataResponseRT.decode(response),
      fold(throwErrors(createPlainError), identity)
    );
  };

  const { error, loading, response, makeRequest } = useHTTPRequest<NodeDetailsMetricDataResponse>(
    '/api/metrics/node_details',
    'POST',
    JSON.stringify({
      metrics,
      nodeId,
      nodeType,
      timerange,
      cloudId,
      sourceId,
    }),
    decodeResponse
  );

  return {
    error,
    loading,
    metrics: response ? response.metrics : [],
    makeRequest,
  };
}
