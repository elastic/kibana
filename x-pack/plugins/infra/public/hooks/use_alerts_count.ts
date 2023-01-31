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
import { AlertSummaryTimeRange } from '@kbn/triggers-actions-ui-plugin/public';
import { InfraClientCoreStart } from '../types';

type AlertsCountTimeRange = Pick<AlertSummaryTimeRange, 'utcFrom' | 'utcTo'>;

interface UseAlertsCountProps {
  featureIds: ValidFeatureId[];
  timeRange: AlertsCountTimeRange;
  filter?: estypes.QueryDslQueryContainer;
}

interface AlertsCount {
  activeAlertCount: number;
  recoveredAlertCount: number;
}

export function useAlertsCount({ featureIds, timeRange, filter }: UseAlertsCountProps) {
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
      timeRange,
    });
  }, [featureIds, filter, http, timeRange]);

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
  timeRange: { utcFrom, utcTo },
}: {
  featureIds: ValidFeatureId[];
  filter?: estypes.QueryDslQueryContainer;
  http: HttpSetup;
  signal: AbortSignal;
  timeRange: AlertsCountTimeRange;
}): Promise<AlertsCount> {
  return http.post(`${BASE_RAC_ALERTS_API_PATH}/_alerts_count`, {
    signal,
    body: JSON.stringify({
      gte: utcFrom,
      lte: utcTo,
      featureIds,
      ...(filter && { filter: [filter] }),
    }),
  });
}
