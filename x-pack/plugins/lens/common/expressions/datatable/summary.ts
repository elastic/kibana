/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { FieldFormat } from '@kbn/field-formats-plugin/common';
import type { Datatable } from '@kbn/expressions-plugin/common';
import { ColumnConfigArg } from './datatable_column';
import { getOriginalId } from './transpose_helpers';
import { isNumericFieldForDatatable } from './utils';

type SummaryRowType = Extract<ColumnConfigArg['summaryRow'], string>;

export function getFinalSummaryConfiguration(
  columnId: string,
  columnArgs: Pick<ColumnConfigArg, 'summaryRow' | 'summaryLabel'> | undefined,
  table: Datatable | undefined
) {
  const isNumeric = isNumericFieldForDatatable(table, columnId);

  const summaryRow = isNumeric ? columnArgs?.summaryRow || 'none' : 'none';
  const summaryLabel = columnArgs?.summaryLabel ?? getDefaultSummaryLabel(summaryRow);

  return {
    summaryRow,
    summaryLabel,
  };
}

export function getDefaultSummaryLabel(type: SummaryRowType) {
  return getSummaryRowOptions().find(({ value }) => type === value)!.label!;
}

export function getSummaryRowOptions(): Array<{
  value: SummaryRowType;
  label: string;
  'data-test-subj': string;
}> {
  return [
    {
      value: 'none',
      label: i18n.translate('xpack.lens.table.summaryRow.none', {
        defaultMessage: 'None',
      }),
      'data-test-subj': 'lns-datatable-summary-none',
    },
    {
      value: 'count',
      label: i18n.translate('xpack.lens.table.summaryRow.count', {
        defaultMessage: 'Value count',
      }),
      'data-test-subj': 'lns-datatable-summary-count',
    },
    {
      value: 'sum',
      label: i18n.translate('xpack.lens.table.summaryRow.sum', {
        defaultMessage: 'Sum',
      }),
      'data-test-subj': 'lns-datatable-summary-sum',
    },
    {
      value: 'avg',
      label: i18n.translate('xpack.lens.table.summaryRow.average', {
        defaultMessage: 'Average',
      }),
      'data-test-subj': 'lns-datatable-summary-avg',
    },
    {
      value: 'min',
      label: i18n.translate('xpack.lens.table.summaryRow.minimum', {
        defaultMessage: 'Minimum',
      }),
      'data-test-subj': 'lns-datatable-summary-min',
    },
    {
      value: 'max',
      label: i18n.translate('xpack.lens.table.summaryRow.maximum', {
        defaultMessage: 'Maximum',
      }),
      'data-test-subj': 'lns-datatable-summary-max',
    },
  ];
}

export function computeSummaryRowForColumn(
  columnArgs: ColumnConfigArg,
  table: Datatable,
  formatters: Record<string, FieldFormat>,
  defaultFormatter: FieldFormat
) {
  const summaryValue = computeFinalValue(columnArgs.summaryRow, columnArgs.columnId, table.rows);
  // ignore the coluymn formatter for the count case
  if (columnArgs.summaryRow === 'count') {
    return defaultFormatter.convert(summaryValue);
  }
  return formatters[getOriginalId(columnArgs.columnId)].convert(summaryValue);
}

function computeFinalValue(
  type: ColumnConfigArg['summaryRow'],
  columnId: string,
  rows: Datatable['rows']
) {
  // flatten the row structure, to easier handle numeric arrays
  const validRows = rows.filter((v) => v[columnId] != null).flatMap((v) => v[columnId]);
  const count = validRows.length;
  const sum = validRows.reduce<number>((partialSum: number, value: number) => {
    return partialSum + value;
  }, 0);
  switch (type) {
    case 'sum':
      return sum;
    case 'count':
      return count;
    case 'avg':
      return sum / count;
    case 'min':
      return Math.min(...validRows);
    case 'max':
      return Math.max(...validRows);
    default:
      throw Error('No summary function found');
  }
}
