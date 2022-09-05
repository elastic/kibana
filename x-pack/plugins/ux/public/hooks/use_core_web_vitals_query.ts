/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEsSearch } from '@kbn/observability-plugin/public';
import { useMemo } from 'react';
import { useDataView } from '../components/app/rum_dashboard/local_uifilters/use_data_view';
import { callDateMath } from '../services/data/call_date_math';
import {
  coreWebVitalsQuery,
  transformCoreWebVitalsResponse,
  PERCENTILE_DEFAULT,
} from '../services/data/core_web_vitals_query';
import { useUxQuery } from '../components/app/rum_dashboard/hooks/use_ux_query';

export function useCoreWebVitalsQuery(uxQuery: ReturnType<typeof useUxQuery>) {
  const { dataViewTitle } = useDataView();
  const { data: esQueryResponse, loading } = useEsSearch(
    {
      index: uxQuery ? dataViewTitle : undefined,
      ...coreWebVitalsQuery(
        callDateMath(uxQuery?.start),
        callDateMath(uxQuery?.end),
        uxQuery?.urlQuery,
        uxQuery?.uiFilters ? JSON.parse(uxQuery.uiFilters) : {},
        uxQuery?.percentile ? Number(uxQuery.percentile) : undefined
      ),
    },
    [uxQuery, dataViewTitle],
    { name: 'UxCoreWebVitals' }
  );
  const data = useMemo(
    () =>
      transformCoreWebVitalsResponse(
        esQueryResponse,
        uxQuery?.percentile ? Number(uxQuery?.percentile) : PERCENTILE_DEFAULT
      ),
    [esQueryResponse, uxQuery?.percentile]
  );
  return { data, loading };
}
