/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import { i18n } from '@kbn/i18n';
import { prepareLogTable } from '@kbn/visualizations-plugin/common/utils';
import type { Datatable, ExecutionContext } from '@kbn/expressions-plugin/common';
import { FormatFactory } from '../../types';
import { computeSummaryRowForColumn } from './summary';
import type { DatatableExpressionFunction } from './types';
import { transposeTable } from './transpose_helpers';

/**
 * Available datatables logged to inspector
 */
export const DatatableInspectorTables = {
  Default: 'default',
  Transpose: 'transpose',
};

export const datatableFn =
  (
    getFormatFactory: (context: ExecutionContext) => FormatFactory | Promise<FormatFactory>
  ): DatatableExpressionFunction['fn'] =>
  async (table, args, context) => {
    if (context?.inspectorAdapters?.tables) {
      context.inspectorAdapters.tables.reset();
      context.inspectorAdapters.tables.allowCsvExport = true;

      const logTable = prepareLogTable(
        table,
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

      context.inspectorAdapters.tables.logDatatable(DatatableInspectorTables.Default, logTable);
    }

    let untransposedData: Datatable | undefined;

    const formatters: Record<string, ReturnType<FormatFactory>> = {};
    const formatFactory = await getFormatFactory(context);

    table.columns.forEach((column) => {
      formatters[column.id] = formatFactory(column.meta?.params);
    });

    const hasTransposedColumns = args.columns.some((c) => c.isTransposed);
    if (hasTransposedColumns) {
      // store original shape of data separately
      untransposedData = cloneDeep(table);
      // transposes table and args in-place
      transposeTable(args, table, formatters);

      if (context?.inspectorAdapters?.tables) {
        const logTransposedTable = prepareLogTable(
          table,
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

        context.inspectorAdapters.tables.logDatatable(
          DatatableInspectorTables.Transpose,
          logTransposedTable
        );
        context.inspectorAdapters.tables.initialSelectedTable = DatatableInspectorTables.Transpose;
      }
    }

    const columnsWithSummary = args.columns.filter((c) => c.summaryRow);
    for (const column of columnsWithSummary) {
      column.summaryRowValue = computeSummaryRowForColumn(
        column,
        table,
        formatters,
        formatFactory({ id: 'number' })
      );
    }

    return {
      type: 'render',
      as: 'lens_datatable_renderer',
      value: {
        data: table,
        untransposedData,
        syncColors: context.isSyncColorsEnabled?.() ?? false,
        args: {
          ...args,
          title: (context.variables.embeddableTitle as string) ?? args.title,
        },
      },
    };
  };
