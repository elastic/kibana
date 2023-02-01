/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRef } from 'react';
import type { ValidFeatureId } from '@kbn/rule-data-utils';
import { estypes } from '@elastic/elasticsearch';
import { HttpSetup } from '@kbn/core/public';
import { BASE_RAC_ALERTS_API_PATH } from '@kbn/rule-registry-plugin/common/constants';
import useAsync from 'react-use/lib/useAsync';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { InfraClientCoreStart } from '../types';

interface UseAlertsCountProps {
  featureIds: ValidFeatureId[];
  filter?: estypes.QueryDslQueryContainer;
}

interface AlertsCount {
  activeAlertCount: number;
  recoveredAlertCount: number;
}

export function useAlertsCount({ featureIds, filter }: UseAlertsCountProps) {
  const { http } = useKibana<InfraClientCoreStart>().services;

  const abortCtrlRef = useRef(new AbortController());

  const {
    value: alertsCount,
    error,
    loading,
  } = useAsync(() => {
    abortCtrlRef.current.abort();
    abortCtrlRef.current = new AbortController();
    return fetchAlertsCount({
      featureIds,
      filter,
      http,
      signal: abortCtrlRef.current.signal,
    });
  }, [featureIds, filter, http]);

  return {
    alertsCount,
    error,
    loading,
  };
}

async function fetchAlertsCount({
  featureIds,
  filter,
  http,
  signal,
}: {
  featureIds: ValidFeatureId[];
  filter?: estypes.QueryDslQueryContainer;
  http: HttpSetup;
  signal: AbortSignal;
}): Promise<AlertsCount> {
  return http.post(`${BASE_RAC_ALERTS_API_PATH}/_alerts_count`, {
    signal,
    body: JSON.stringify({
      featureIds,
      ...(filter && { filter: [filter] }),
    }),
  });
}
