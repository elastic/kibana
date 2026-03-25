/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { Environment } from '../../../../common/environment_rt';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';

export type ServiceMapGroupByValuesResponse = Record<string, string>;

/**
 * Fetches the primary value of groupByField per service from the APM index.
 * Used when grouping the service map by a field that is not on the map response (e.g. transaction.type, host.name).
 * Only runs when groupByField is set and serviceNames is non-empty.
 */
export function useServiceMapGroupByValues({
  serviceNames,
  groupByField,
  start,
  end,
  environment,
  kuery,
}: {
  serviceNames: string[];
  groupByField: string | null;
  start: string;
  end: string;
  environment: Environment;
  kuery: string;
}): { data: ServiceMapGroupByValuesResponse; status: FETCH_STATUS } {
  const { config } = useApmPluginContext();

  const fetcherResult = useFetcher(
    (callApmApi) => {
      if (
        !config.serviceMapEnabled ||
        !groupByField ||
        serviceNames.length === 0
      ) {
        return;
      }

      return callApmApi('GET /internal/apm/service-map/group-by-values', {
        params: {
          query: {
            serviceNames: serviceNames.join(','),
            groupByField,
            start,
            end,
            environment,
            kuery: kuery ?? '',
          },
        },
      });
    },
    [
      config.serviceMapEnabled,
      groupByField,
      serviceNames.join(','),
      start,
      end,
      environment,
      kuery,
    ]
  );

  const { data, status } = fetcherResult;

  const groupByValues = useMemo((): ServiceMapGroupByValuesResponse => {
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      return data as ServiceMapGroupByValuesResponse;
    }
    return {};
  }, [data]);

  return {
    data: groupByValues,
    status: status ?? FETCH_STATUS.NOT_INITIATED,
  };
}
