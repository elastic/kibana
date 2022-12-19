/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import type { ValidFeatureId } from '@kbn/rule-data-utils';
import { estypes } from '@elastic/elasticsearch';
import { AsApiContract } from '@kbn/actions-plugin/common';
import { HttpSetup } from '@kbn/core/public';
import { BASE_RAC_ALERTS_API_PATH } from '@kbn/rule-registry-plugin/common/constants';
import { useKibana } from '../../common/lib/kibana';

export interface AlertSummaryTimeRange {
  utcFrom: string;
  utcTo: string;
  // fixed_interval condition in ES query such as '1m', '1d'
  fixedInterval: string;
  title: JSX.Element | string;
}

interface UseLoadAlertSummaryProps {
  featureIds?: ValidFeatureId[];
  timeRange: AlertSummaryTimeRange;
  filter?: estypes.QueryDslQueryContainer;
}

interface AlertSummary {
  activeAlertCount: number;
  activeAlerts?: object[];
  recoveredAlertCount: number;
  recoveredAlerts?: object[];
  error?: string;
}

interface LoadAlertSummaryResponse {
  isLoading: boolean;
  alertSummary: {
    active: number;
    recovered: number;
  };
  error?: string;
}

export function useLoadAlertSummary({ featureIds, timeRange, filter }: UseLoadAlertSummaryProps) {
  const { http } = useKibana().services;
  const [alertSummary, setAlertSummary] = useState<LoadAlertSummaryResponse>({
    isLoading: true,
    alertSummary: { active: 0, recovered: 0 },
  });
  const isCancelledRef = useRef(false);
  const abortCtrlRef = useRef(new AbortController());
  const loadAlertSummary = useCallback(async () => {
    if (!featureIds) return;
    isCancelledRef.current = false;
    abortCtrlRef.current.abort();
    abortCtrlRef.current = new AbortController();

    try {
      const { activeAlertCount, recoveredAlertCount, error } = await fetchAlertSummary({
        featureIds,
        filter,
        http,
        signal: abortCtrlRef.current.signal,
        timeRange,
      });
      if (error) throw error;
      if (!isCancelledRef.current) {
        setAlertSummary((oldState) => ({
          ...oldState,
          alertSummary: {
            active: activeAlertCount,
            recovered: recoveredAlertCount,
          },
          isLoading: false,
        }));
      }
    } catch (error) {
      if (!isCancelledRef.current) {
        if (error.name !== 'AbortError') {
          setAlertSummary((oldState) => ({
            ...oldState,
            isLoading: false,
            error: error.message,
          }));
        }
      }
    }
  }, [featureIds, filter, http, timeRange]);

  useEffect(() => {
    loadAlertSummary();
  }, [loadAlertSummary]);

  return alertSummary;
}

async function fetchAlertSummary({
  featureIds,
  filter,
  http,
  signal,
  timeRange: { utcFrom, utcTo, fixedInterval },
}: {
  http: HttpSetup;
  featureIds: ValidFeatureId[];
  signal: AbortSignal;
  timeRange: AlertSummaryTimeRange;
  filter?: estypes.QueryDslQueryContainer;
}): Promise<AlertSummary> {
  try {
    const res = await http.post<AsApiContract<any>>(`${BASE_RAC_ALERTS_API_PATH}/_alert_summary`, {
      signal,
      body: JSON.stringify({
        fixed_interval: fixedInterval,
        gte: utcFrom,
        lte: utcTo,
        featureIds,
        filter: [filter],
      }),
    });

    const activeAlertCount = res?.activeAlertCount ?? 0;
    const recoveredAlertCount = res?.recoveredAlertCount ?? 0;

    return {
      activeAlertCount,
      recoveredAlertCount,
    };
  } catch (error) {
    return {
      error,
      activeAlertCount: 0,
      recoveredAlertCount: 0,
    };
  }
}
