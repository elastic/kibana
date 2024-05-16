/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Query, AggregateQuery, Filter, TimeRange } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { ExpressionsStart, Datatable } from '@kbn/expressions-plugin/public';
import type { Adapters } from '@kbn/inspector-plugin/common';
import { textBasedQueryStateToAstWithValidation } from '@kbn/data-plugin/common';
import { useCallback, useRef, useState } from 'react';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import { lastValueFrom, pluck } from 'rxjs';

interface UseTextBasedEventsArgs {
  query: AggregateQuery;
  dataView?: DataView;
  data: DataPublicPluginStart;
  expressions: ExpressionsStart;
  inspectorAdapters?: Adapters;
  abortSignal?: AbortSignal;
  filters?: Filter[];
  inputQuery?: Query;
}

interface ESQLRequest {
  query: AggregateQuery;
  dataView: DataView;
  filters?: Filter[];
  inputQuery?: Query;
  time?: TimeRange;
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
  data,
  expressions,
  inspectorAdapters,
  filters,
  inputQuery,
}: UseTextBasedEventsArgs) => {
  const timeRange = data.query.timefilter.timefilter.getTime();

  const abortController = useRef(new AbortController());
  const [isLoading, setIsLoading] = useState(false);

  const convertQueryToAst = useCallback(async () => {
    const ast = await textBasedQueryStateToAstWithValidation({
      query,
      dataView,
      filters,
      time: timeRange,
      inputQuery,
      titleForInspector: 'ESQL Inspector',
      descriptionForInspector: 'Elasticsearch Query',
    });

    return ast;
  }, [query, dataView, filters, inputQuery, timeRange]);

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    const ast = await convertQueryToAst();
    if (!ast)
      return {
        data: [],
        textBasedQueryColumns: [],
        textBasedHeaderWarning: undefined,
      };
    const contract = expressions.execute(ast, null, {
      inspectorAdapters,
    });

    abortController.current.signal?.addEventListener('abort', () => {
      contract.cancel();
    });

    const execution = contract.getData();
    let finalData: DataTableRecord[] = [];
    let textBasedQueryColumns: Datatable['columns'] | undefined;
    let error: string | undefined;
    let textBasedHeaderWarning: string | undefined;

    execution.pipe(pluck('result')).subscribe((resp) => {
      const response = resp as Datatable | TextBasedErrorResponse;
      console.log({ response });
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
      }

      setIsLoading(false);
    });

    if (error) {
      throw new Error(error);
    }

    await lastValueFrom(execution);

    const returnOutput = {
      data: finalData,
      textBasedQueryColumns,
      textBasedHeaderWarning,
    };
    console.log({ returnOutput });

    return returnOutput;
  }, [convertQueryToAst, expressions, inspectorAdapters]);

  return {
    fetch: fetchEvents,
    isLoading,
  };
};
