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
  PERCENTILE_DEFAULT,
} from '../services/data/core_web_vitals_query';
import { useUxQuery } from '../components/app/rum_dashboard/hooks/use_ux_query';

const getRanksPercentages = (ranks?: Record<string, number | null>) => {
  if (!Array.isArray(ranks)) return null;
  const ranksVal = ranks?.map(({ value }) => value?.toFixed(0) ?? 0) ?? [];
  return [
    Number(ranksVal?.[0]),
    Number(ranksVal?.[1]) - Number(ranksVal?.[0]),
    100 - Number(ranksVal?.[1]),
  ];
};

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
  const data = useMemo(() => {
    if (!esQueryResponse) return esQueryResponse;
    const {
      lcp,
      cls,
      fid,
      tbt,
      fcp,
      lcpRanks,
      fidRanks,
      clsRanks,
      coreVitalPages,
    } = esQueryResponse.aggregations ?? {};

    const defaultRanks = [100, 0, 0];

    const pkey = (
      !!uxQuery?.percentile ? Number(uxQuery?.percentile) : PERCENTILE_DEFAULT
    ).toFixed(1);

    return {
      coreVitalPages: coreVitalPages?.doc_count ?? 0,
      /* Because cls is required in the type UXMetrics, and defined as number | null,
       * we need to default to null in the case where cls is undefined in order to satisfy the UXMetrics type */
      cls: cls?.values[pkey] ?? null,
      fid: fid?.values[pkey],
      lcp: lcp?.values[pkey],
      tbt: tbt?.values[pkey] ?? 0,
      fcp: fcp?.values[pkey],

      lcpRanks: lcp?.values[pkey]
        ? getRanksPercentages(lcpRanks?.values) ?? defaultRanks
        : defaultRanks,
      fidRanks: fid?.values[pkey]
        ? getRanksPercentages(fidRanks?.values) ?? defaultRanks
        : defaultRanks,
      clsRanks: cls?.values[pkey]
        ? getRanksPercentages(clsRanks?.values) ?? defaultRanks
        : defaultRanks,
    };
  }, [esQueryResponse, uxQuery?.percentile]);
  return { data, loading };
}
