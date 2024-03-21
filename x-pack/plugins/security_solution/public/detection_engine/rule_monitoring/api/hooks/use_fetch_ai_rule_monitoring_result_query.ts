/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { HealthIntervalParameters } from '../../../../../common/api/detection_engine';
import { GET_AI_RULE_MONITORING_RESULTS_URL } from '../../../../../common/api/detection_engine';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { fetchAiRuleMonitoringResult } from '../fetch_ai_rule_monitoring_result';

const GET_AI_RULE_MONITORING_RESULTS_QUERY_KEY = ['POST', GET_AI_RULE_MONITORING_RESULTS_URL];

export function useFetchAiRuleMonitoringResultQuery(
  connectorId: string,
  interval?: HealthIntervalParameters,
  options?: UseQueryOptions<string>
): UseQueryResult<string> {
  const { addError } = useAppToasts();

  return useQuery<string>(
    [...GET_AI_RULE_MONITORING_RESULTS_QUERY_KEY],
    ({ signal }) => fetchAiRuleMonitoringResult({ connectorId, interval, signal }),
    {
      refetchIntervalInBackground: false,
      staleTime: Infinity,
      ...options,
      onError: (error) => {
        addError(error, {
          title: 'Unable to fetch AI Rule Monitoring result',
        });
      },
    }
  );
}
