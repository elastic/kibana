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
import { textBasedQueryStateToAstWithValidation } from '@kbn/data-plugin/common';
import { useCallback, useEffect, useRef } from 'react';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { Subscription } from 'rxjs';
import { lastValueFrom, pluck } from 'rxjs';
import { useQuery } from '@tanstack/react-query';

interface UseTextBasedEventsArgs {
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

export interface SecuritySolutionTextBasedQueryResponse {
  data: DataTableRecord[];
  columns: Datatable['columns'];
  warnings: string | undefined;
}

interface TextBasedErrorResponse {
  error: {
    message: string;
  };
  type: 'error';
}

interface TextBasedRequestPayload {
  query: AggregateQuery;
  filters?: Filter[];
  inputQuery?: Query;
  timeRange: TimeRange;
}

const defaultTextBasedQueryResponse: SecuritySolutionTextBasedQueryResponse = {
  data: [],
  columns: [],
  warnings: undefined,
};

export const useTextBasedEvents = ({
  query,
  dataView,
  expressions,
  inspectorAdapters,
  filters,
  inputQuery,
  timeRange,
}: UseTextBasedEventsArgs) => {
  const abortController = useRef(new AbortController());
  const queryDataSubscriptionRef = useRef<Subscription | null>(null);

  useEffect(() => {
    return () => {
      queryDataSubscriptionRef.current?.unsubscribe();
    };
  }, []);

  const convertQueryToAst = useCallback(() => {
    return textBasedQueryStateToAstWithValidation({
      query,
      dataView,
      filters,
      time: timeRange,
      inputQuery,
      titleForInspector: 'ESQL Inspector',
      descriptionForInspector: 'ESQL Query for Security Solution',
    });
  }, [dataView, filters, timeRange, inputQuery, query]);

  const fetchEvents = useCallback(async () => {
    const ast = await convertQueryToAst();
    if (!ast) {
      return defaultTextBasedQueryResponse;
    }

    const contract = expressions.execute(ast, null, {
      inspectorAdapters,
    });

    abortController.current.signal?.addEventListener('abort', () => {
      contract.cancel();
    });

    const execution = contract.getData();
    let finalData: DataTableRecord[] = [];
    let textBasedQueryColumns: Datatable['columns'] = [];
    let error: string | undefined;
    let textBasedHeaderWarning: string | undefined;

    if (queryDataSubscriptionRef.current) {
      queryDataSubscriptionRef.current.unsubscribe();
    }

    queryDataSubscriptionRef.current = execution.pipe(pluck('result')).subscribe((resp) => {
      const response = resp as Datatable | TextBasedErrorResponse;
      if ('type' in response && response.type === 'error') {
        error = response.error.message;
      } else {
        const table = response as Datatable;
        const rows = table?.rows ?? [];
        finalData = rows.map((row: Record<string, string>, idx: number) => {
          return {
            id: String(idx),
            raw: row,
            flattened: row,
          } as unknown as DataTableRecord;
        });

        textBasedQueryColumns = table?.columns ?? [];
        textBasedHeaderWarning = table.warning ?? undefined;
      }
    });

    if (error) {
      throw new Error(error);
    }

    await lastValueFrom(execution);

    return {
      data: finalData,
      columns: textBasedQueryColumns,
      warnings: textBasedHeaderWarning,
    };
  }, [convertQueryToAst, expressions, inspectorAdapters]);

  const queryResult = useQuery(['esql', query, timeRange, filters], fetchEvents, {
    enabled: true,
    refetchOnWindowFocus: false,
    initialData: defaultTextBasedQueryResponse,
  });

  return queryResult;
};
