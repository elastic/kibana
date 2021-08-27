/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useApmPluginContext } from '../apm_plugin/use_apm_plugin_context';
import { useFetcher } from '../../hooks/use_fetcher';
import type { APMServiceAlert } from './apm_service_context';

export function useServiceAlertsFetcher({
  serviceName,
  transactionType,
  environment,
  start,
  end,
}: {
  serviceName?: string;
  transactionType?: string;
  environment: string;
  start: string;
  end: string;
}) {
  const {
    plugins: { observability },
  } = useApmPluginContext();

  const experimentalAlertsEnabled = observability.isAlertingExperienceEnabled();

  const fetcherStatus = useFetcher(
    (callApmApi) => {
      if (
        !start ||
        !end ||
        !serviceName ||
        !transactionType ||
        !experimentalAlertsEnabled
      ) {
        return;
      }

      return callApmApi({
        endpoint: 'GET /api/apm/services/{serviceName}/alerts',
        params: {
          path: {
            serviceName,
          },
          query: {
            start,
            end,
            transactionType,
            environment,
          },
        },
      }).catch((error) => {
        console.error(error);
        return {
          alerts: [] as APMServiceAlert[],
        };
      });
    },
    [
      start,
      end,
      serviceName,
      transactionType,
      environment,
      experimentalAlertsEnabled,
    ]
  );

  const { data, ...rest } = fetcherStatus;

  return {
    ...rest,
    alerts: data?.alerts ?? [],
  };
}
