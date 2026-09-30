/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { Error } from '@kbn/apm-types';
import { useFetcher, isPending, isSuccess } from '../../../../hooks/use_fetcher';
import { FETCHER_OPERATION_IDS } from '../../../../hooks/fetcher_operation_ids';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { NOT_AVAILABLE_LABEL } from '../../../../../common/i18n';

/**
 * Flat view model for a single row in the "Errors from logs" table.
 *
 * Flattened here (rather than in the columns) so that `getItemsFilteredBySearchQuery`
 * can do plain `item[field]` access, and `EuiInMemoryTable` `sorting` works without
 * per-column `sortable:` closures.
 */
export interface ErrorFromLogsRow {
  id: string;
  index?: string;
  traceId?: string;
  spanId?: string;
  /** Exception message. Empty string when the field is absent. */
  message: string;
  /** Exception type. Empty string when the field is absent. */
  type: string;
  /** Occurrence time in microseconds. */
  timestampUs: number;
}

function toRow(error: Error): ErrorFromLogsRow {
  return {
    id: error.id,
    index: error.index,
    traceId: error.trace?.id,
    spanId: error.span?.id,
    message: error.error?.exception?.message ?? '',
    type: error.error?.exception?.type ?? '',
    timestampUs: error.timestamp.us,
  };
}

export function useServiceErrorsFromLogs({
  serviceName,
  environment,
  kuery,
  rangeFrom,
  rangeTo,
}: {
  serviceName: string;
  environment: string;
  kuery: string;
  rangeFrom: string;
  rangeTo: string;
}) {
  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const { data, status } = useFetcher(
    (callApmApi) => {
      if (!start || !end) return;
      return callApmApi('GET /internal/apm/services/{serviceName}/errors/unprocessed_otel', {
        params: {
          path: { serviceName },
          query: { start, end, environment, kuery },
        },
      });
    },
    [serviceName, start, end, environment, kuery],
    { operationId: FETCHER_OPERATION_IDS.FETCH_SERVICE_ERRORS_FROM_LOGS }
  );

  const rows = useMemo<ErrorFromLogsRow[]>(
    () => (data?.unprocessedOtelErrors ?? []).map(toRow),
    [data]
  );

  return {
    rows,
    status,
    isLoading: isPending(status),
    /** True when the response succeeded and there is at least one row. */
    hasRows: isSuccess(status) && rows.length > 0,
    /** True when the result set was capped server-side. */
    maxCountExceeded: data?.maxCountExceeded ?? false,
    /** Placeholder for the "No errors found" case — stable reference so it isn't
     *  treated as a new value on every render. */
    noDataLabel: NOT_AVAILABLE_LABEL,
  };
}

export type UseServiceErrorsFromLogsResult = ReturnType<typeof useServiceErrorsFromLogs>;
