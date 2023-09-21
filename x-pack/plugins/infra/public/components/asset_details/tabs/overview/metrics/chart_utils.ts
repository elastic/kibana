/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MultiValueClickContext } from '@kbn/embeddable-plugin/public';
import { TimeRange } from '@kbn/es-query';
import { DatatableColumn, DatatableRow } from '@kbn/expressions-plugin/common/expression_types';
import type { OnFilterEvent } from '../../../../lens';

type ChartClickContextData = MultiValueClickContext['data']['data'];

export function isChartClickContextData(data: unknown): data is ChartClickContextData {
  return Array.isArray(data) && Array.isArray(data[0]?.cells) && data[0].cells.length > 0;
}

export function calculateChartRowsTimeInterval(
  rows: DatatableRow[],
  timestampColumnId: string
): number {
  if (rows.length < 2) {
    return 0;
  }

  return Math.abs(rows[1][timestampColumnId] - rows[0][timestampColumnId]);
}

export function extractTableEntryFromChartClickContextData(data: ChartClickContextData): {
  row: DatatableRow | null;
  column: DatatableColumn | null;
} {
  const table = data[0].table;
  const cell = data[0].cells[0];
  const column = table.columns[cell.column] ?? null;
  const row = table.rows[cell.row] ?? null;

  return { column, row };
}

export function extractRangeFromChartFilterEvent({ data }: OnFilterEvent): TimeRange | null {
  if (!isChartClickContextData(data)) {
    return null;
  }

  const { column, row } = extractTableEntryFromChartClickContextData(data);

  if (!column || !row || column.meta.type !== 'date') {
    return null;
  }

  const timestamp = row[column.id];
  const rowInterval = calculateChartRowsTimeInterval(data[0].table.rows, column.id);
  const from = new Date(timestamp).toISOString();
  const to = new Date(timestamp + rowInterval).toISOString();

  return { from, to };
}
