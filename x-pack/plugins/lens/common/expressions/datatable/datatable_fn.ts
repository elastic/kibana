/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import { i18n } from '@kbn/i18n';
import { prepareLogTable } from '../../../../../../src/plugins/visualizations/common/utils';
import { FormatFactory, LensMultiTable } from '../../types';
import { transposeTable } from './transpose_helpers';
import { computeSummaryRowForColumn } from './summary';
import { getSortingCriteria } from './sorting';
import type {
  DatatableColumnMeta,
  ExecutionContext,
} from '../../../../../../src/plugins/expressions';
import type { DatatableExpressionFunction } from './types';

function isRange(meta: { params?: { id?: string } } | undefined) {
  return meta?.params?.id === 'range';
}

export const datatableFn =
  (
    getFormatFactory: (context: ExecutionContext) => FormatFactory | Promise<FormatFactory>
  ): DatatableExpressionFunction['fn'] =>
  async (data, args, context) => {
    const [firstTable] = Object.values(data.tables);
    if (context?.inspectorAdapters?.tables) {
      const logTable = prepareLogTable(
        Object.values(data.tables)[0],
        [
          [
            args.columns.map((column) => column.columnId),
            i18n.translate('xpack.lens.datatable.column.help', {
              defaultMessage: 'Datatable column',
            }),
          ],
        ],
        true
      );

      context.inspectorAdapters.tables.logDatatable('default', logTable);
    }

    let untransposedData: LensMultiTable | undefined;
    // do the sorting at this level to propagate it also at CSV download
    const [layerId] = Object.keys(context.inspectorAdapters.tables || {});
    const formatters: Record<string, ReturnType<FormatFactory>> = {};
    const formatFactory = await getFormatFactory(context);

    firstTable.columns.forEach((column) => {
      formatters[column.id] = formatFactory(column.meta?.params);
    });

    const hasTransposedColumns = args.columns.some((c) => c.isTransposed);
    if (hasTransposedColumns) {
      // store original shape of data separately
      untransposedData = cloneDeep(data);
      // transposes table and args inplace
      transposeTable(args, firstTable, formatters);
    }

    const { sortingColumnId: sortBy, sortingDirection: sortDirection } = args;

    const columnsReverseLookup = firstTable.columns.reduce<
      Record<string, { name: string; index: number; meta?: DatatableColumnMeta }>
    >((memo, { id, name, meta }, i) => {
      memo[id] = { name, index: i, meta };
      return memo;
    }, {});

    const columnsWithSummary = args.columns.filter((c) => c.summaryRow);
    for (const column of columnsWithSummary) {
      column.summaryRowValue = computeSummaryRowForColumn(
        column,
        firstTable,
        formatters,
        formatFactory({ id: 'number' })
      );
    }

    if (sortBy && columnsReverseLookup[sortBy] && sortDirection !== 'none') {
      const sortingHint = args.columns.find((col) => col.columnId === sortBy)?.sortingHint;
      // Sort on raw values for these types, while use the formatted value for the rest
      const sortingCriteria = getSortingCriteria(
        sortingHint ??
          (isRange(columnsReverseLookup[sortBy]?.meta)
            ? 'range'
            : columnsReverseLookup[sortBy]?.meta?.type),
        sortBy,
        formatters[sortBy],
        sortDirection
      );
      // replace the table here
      context.inspectorAdapters.tables[layerId].rows = (firstTable.rows || [])
        .slice()
        .sort(sortingCriteria);
      // replace also the local copy
      firstTable.rows = context.inspectorAdapters.tables[layerId].rows;
    } else {
      args.sortingColumnId = undefined;
      args.sortingDirection = 'none';
    }
    return {
      type: 'render',
      as: 'lens_datatable_renderer',
      value: {
        data,
        untransposedData,
        args,
      },
    };
  };
