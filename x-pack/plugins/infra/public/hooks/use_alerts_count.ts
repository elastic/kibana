/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import useAsyncFn from 'react-use/lib/useAsyncFn';

import { BASE_RAC_ALERTS_API_PATH } from '@kbn/rule-registry-plugin/common/constants';
import { estypes } from '@elastic/elasticsearch';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { HttpSetup } from '@kbn/core/public';
import type { ValidFeatureId } from '@kbn/rule-data-utils';

import { InfraClientCoreStart } from '../types';

interface UseAlertsCountProps {
  featureIds: ValidFeatureId[];
  filter?: estypes.QueryDslQueryContainer;
}

interface FetchAlertsCountParams {
  featureIds: ValidFeatureId[];
  filter?: estypes.QueryDslQueryContainer;
  http: HttpSetup;
  signal: AbortSignal;
}

interface AlertsCount {
  activeAlertCount: number;
  recoveredAlertCount: number;
}

export function useAlertsCount({ featureIds, filter }: UseAlertsCountProps) {
  const { http } = useKibana<InfraClientCoreStart>().services;

  const abortCtrlRef = useRef(new AbortController());

  const [state, refetch] = useAsyncFn(
    () => {
      abortCtrlRef.current.abort();
      abortCtrlRef.current = new AbortController();
      return fetchAlertsCount({
        featureIds,
        filter,
        http,
        signal: abortCtrlRef.current.signal,
      });
    },
    [featureIds, filter, http],
    { loading: true }
  );

  useEffect(() => {
    refetch();
  }, [refetch]);

  const { value: alertsCount, error, loading } = state;

  return {
    alertsCount,
    error,
    loading,
    refetch,
  };
}

async function fetchAlertsCount({
  featureIds,
  filter,
  http,
  signal,
}: FetchAlertsCountParams): Promise<AlertsCount> {
  return http.post(`${BASE_RAC_ALERTS_API_PATH}/_alerts_count`, {
    signal,
    body: JSON.stringify({
      featureIds,
      ...(filter && { filter: [filter] }),
    }),
  });
}
