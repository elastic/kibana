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
import type { InventoryItemType } from '@kbn/metrics-data-access-plugin/common';
import type { InfraSavedCustomDashboard } from '../../../../common/custom_dashboards';
import { InfraGetCustomDashboardsResponseBodyRT } from '../../../../common/http_api/custom_dashboards_api';
import { useHTTPRequest } from '../../../hooks/use_http_request';
import { throwErrors, createPlainError } from '../../../../common/runtime_types';
import { useRequestObservable } from './use_request_observable';

interface UseDashboardProps {
  assetType: InventoryItemType;
}

export function useFetchCustomDashboard({ assetType }: UseDashboardProps) {
  const { request$ } = useRequestObservable();

  const decodeResponse = (response: any) => {
    return pipe(
      InfraGetCustomDashboardsResponseBodyRT.decode(response),
      fold(throwErrors(createPlainError), identity)
    );
  };

  const { error, loading, response, makeRequest } = useHTTPRequest<InfraSavedCustomDashboard[]>(
    `/api/infra/${assetType}/custom-dashboards`,
    'GET',
    undefined,
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
    error: (error && error.message) || null,
    loading,
    dashboards: response,
    reload: makeRequest,
  };
}
