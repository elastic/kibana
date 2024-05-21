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
import { useCallback, useMemo, useRef, useState } from 'react';
import type { DataTableRecord } from '@kbn/discover-utils/types';
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
  const [isLoading, setIsLoading] = useState(false);

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
  }, [query, dataView, filters, inputQuery, timeRange]);

  const fetchEvents: () => Promise<SecuritySolutionTextBasedQueryResponse> =
    useCallback(async () => {
      setIsLoading(true);
      const ast = await convertQueryToAst();
      if (!ast) {
        return {
          data: [],
          columns: [],
          warnings: undefined,
        };
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

      execution.pipe(pluck('result')).subscribe((resp) => {
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

        setIsLoading(false);
      });

      if (error) {
        throw new Error(error);
      }

      await lastValueFrom(execution);

      const returnOutput = {
        data: finalData,
        columns: textBasedQueryColumns,
        warnings: textBasedHeaderWarning,
      };

      return returnOutput;
    }, [convertQueryToAst, expressions, inspectorAdapters]);

  const { isLoading: isQueryLoading, ...result } = useQuery(['esql'], fetchEvents, {
    enabled: false,
    refetchOnWindowFocus: false,
    initialData: {
      data: [],
      columns: [],
      warnings: undefined,
    },
  });

  return useMemo(
    () => ({
      ...result,
      isLoading: isQueryLoading || isLoading,
    }),
    [result, isLoading, isQueryLoading]
  );
};
