/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEsSearch } from '@kbn/observability-shared-plugin/public';
import { useMemo } from 'react';
import {
  ENVIRONMENT_ALL,
  ENVIRONMENT_NOT_DEFINED,
} from '../../common/environment_filter_values';
import { useDataView } from '../components/app/rum_dashboard/local_uifilters/use_data_view';
import {
  getEnvironments,
  transformEnvironmentsResponse,
} from '../services/data/environments_query';
import { callDateMath } from '../services/data/call_date_math';
import { useKibanaServices } from './use_kibana_services';

function getEnvironmentOptions(environments: string[]) {
  const environmentOptions = environments
    .filter((env) => env !== ENVIRONMENT_NOT_DEFINED.value)
    .map((environment) => ({
      value: environment,
      text: environment,
    }));

  return [ENVIRONMENT_ALL, ...environmentOptions];
}

export function useEnvironmentsFetcher({
  serviceName,
  start,
  end,
}: {
  serviceName?: string;
  start?: string;
  end?: string;
}) {
  const { dataViewTitle } = useDataView();
  const kibana = useKibanaServices();
  const size =
    // @ts-ignore defaults field should exist and contain this value
    kibana.uiSettings?.defaults?.['observability:maxSuggestions']?.value ?? 100;
  const { data: esQueryResponse, loading } = useEsSearch(
    {
      index: dataViewTitle,
      ...getEnvironments({
        serviceName,
        start: callDateMath(start),
        end: callDateMath(end),
        size,
      }),
    },
    [dataViewTitle, serviceName, start, end, size],
    { name: 'UxEnvironments' }
  );

  const environments = useMemo(
    () => transformEnvironmentsResponse(esQueryResponse) ?? [],
    [esQueryResponse]
  );

  const environmentOptions = useMemo(
    () => getEnvironmentOptions(environments),
    [environments]
  );

  return { environments, loading, environmentOptions };
}
