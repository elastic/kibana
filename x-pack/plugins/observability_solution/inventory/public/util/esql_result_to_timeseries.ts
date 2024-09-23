/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { orderBy } from 'lodash';
import type { AbortableAsyncState } from '@kbn/observability-utils-browser/hooks/use_abortable_async';
import type { ESQLSearchResponse } from '@kbn/es-types';

interface Timeseries<T extends string> {
  id: string;
  label: string;
  metricNames: T[];
  data: Array<{ x: number } & Record<T, number | null>>;
}

export function esqlResultToTimeseries<T extends string>({
  result,
  metricNames,
}: {
  result: AbortableAsyncState<ESQLSearchResponse>;
  metricNames: T[];
}): Array<Timeseries<T>> {
  const columns = result.value?.columns;

  const rows = result.value?.values;

  if (!columns?.length || !rows?.length) {
    return [];
  }

  const timestampColumn = columns.find((col) => col.name === '@timestamp');

  if (!timestampColumn) {
    return [];
  }

  const collectedSeries: Map<string, Timeseries<T>> = new Map();

  rows.forEach((columnsInRow) => {
    const values = new Map<string, number | null>();
    const labels = new Map<string, string>();
    let timestamp: number;

    columnsInRow.forEach((value, index) => {
      const column = columns[index];
      const isTimestamp = column.name === '@timestamp';
      const isMetric = metricNames.indexOf(column.name as T) !== -1;

      if (isTimestamp) {
        timestamp = new Date(value as string | number).getTime();
      } else if (isMetric) {
        values.set(column.name, value as number | null);
      } else {
        labels.set(column.name, String(value));
      }
    });

    const seriesKey =
      Array.from(labels.entries())
        .map(([key, value]) => [key, value].join(':'))
        .sort()
        .join(',') || '-';

    if (!collectedSeries.has(seriesKey)) {
      collectedSeries.set(seriesKey, {
        id: seriesKey,
        data: [],
        label: seriesKey,
        metricNames,
      });
    }

    const series = collectedSeries.get(seriesKey)!;

    const coordinate = {
      x: timestamp!,
    } as { x: number } & Record<T, number | null>;

    values.forEach((value, key) => {
      if (key !== 'x') {
        // @ts-expect-error
        coordinate[key as T] = value;
      }
    });

    series.data.push(coordinate);

    return collectedSeries;
  });

  return Array.from(collectedSeries.entries()).map(([id, timeseries]) => {
    return {
      ...timeseries,
      data: orderBy(timeseries.data, 'x', 'asc'),
    };
  });
}
