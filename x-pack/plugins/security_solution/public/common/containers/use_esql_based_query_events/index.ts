/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Query, AggregateQuery, Filter, TimeRange } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { ExpressionsStart, Datatable } from '@kbn/expressions-plugin/public';
import type { Adapters } from '@kbn/inspector-plugin/common';
import { useCallback, useMemo, useRef } from 'react';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import { useQuery } from '@tanstack/react-query';
import { i18n } from '@kbn/i18n';
import { fetchFieldsFromESQL } from '@kbn/text-based-editor';

export interface UseESQLBasedEventsArgs {
  query: AggregateQuery;
  dataView?: DataView;
  expressions: ExpressionsStart;
  inspectorAdapters?: Adapters;
  abortSignal?: AbortSignal;
  filters?: Filter[];
  inputQuery?: Query;
  timeRange: TimeRange;
  titleForInspector?: string;
  descriptionForInspector?: string;
}

export interface SecuritySolutionESQLBasedQueryResponse {
  rows: DataTableRecord[];
  columns: Datatable['columns'];
  warnings: string | undefined;
}

export interface SecuritySolutionESQLBasedErrorResponse {
  error: {
    message: string;
  };
  type: 'error';
}

const defaultESQLBasedQueryResponse: SecuritySolutionESQLBasedQueryResponse = {
  rows: [],
  columns: [],
  warnings: undefined,
};

export const useESQLBasedEvents = ({
  query,
  dataView,
  expressions,
  inspectorAdapters,
  filters,
  timeRange,
  titleForInspector,
  descriptionForInspector,
}: UseESQLBasedEventsArgs) => {
  const abortController = useRef(new AbortController());
  const inspectorTitle =
    titleForInspector ??
    i18n.translate('xpack.securitySolution.esql.inspector.title', {
      defaultMessage: 'Security Solution ESQL',
    });
  const inspectorDescription =
    descriptionForInspector ??
    i18n.translate('xpack.securitySolution.esql.inspector.description', {
      defaultMessage:
        'This request queries Elasticsearch to fetch the data for the ESQL based requests.',
    });

  const fetchEvents = useCallback(async () => {
    if (!query || !query.esql) {
      return defaultESQLBasedQueryResponse;
    }

    const dataTableData = await fetchFieldsFromESQL(
      query,
      expressions,
      timeRange,
      abortController.current,
      dataView,
      { inspectorAdapters },
      inspectorTitle,
      inspectorDescription
    );

    if (!dataTableData) {
      return defaultESQLBasedQueryResponse;
    }

    const { rows = [], columns = [] } = dataTableData;
    const formattedRows = rows.map((row: Record<string, string>, idx: number) => {
      return {
        id: String(idx),
        raw: row,
        flattened: row,
      } as unknown as DataTableRecord;
    });

    return {
      rows: formattedRows,
      columns,
      warnings: dataTableData.warning ?? undefined,
    };
  }, [
    abortController,
    dataView,
    expressions,
    query,
    inspectorAdapters,
    inspectorDescription,
    inspectorTitle,
    timeRange,
  ]);

  const { data = defaultESQLBasedQueryResponse, ...restQueryResult } = useQuery(
    ['esql', query, timeRange, filters],
    fetchEvents,
    {
      refetchOnWindowFocus: false,
      keepPreviousData: true,
      enabled: !!query?.esql,
    }
  );

  return useMemo(() => ({ ...restQueryResult, data }), [data, restQueryResult]);
};
