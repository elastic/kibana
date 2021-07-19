/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import type {
  DatatableColumnMeta,
  ExpressionFunctionDefinition,
} from '../../../../../../src/plugins/expressions/common';
import type { FormatFactory, LensMultiTable } from '../../types';
import { ColumnConfigArg } from './datatable_column';
import { getSortingCriteria } from './sorting';
import { computeSummaryRowForColumn } from './summary';
import { transposeTable } from './transpose_helpers';

export interface DatatableTransformerResult {
  type: 'multiple_lens_multitable';
  data: LensMultiTable;
  untransposedData?: LensMultiTable;
  columns: ColumnConfigArg[];
}

export interface DatatableTransformerArgs {
  columns: ColumnConfigArg[];
  sortingColumnId: string | undefined;
  sortingDirection: 'asc' | 'desc' | 'none';
}

function isRange(meta: { params?: { id?: string } } | undefined) {
  return meta?.params?.id === 'range';
}

export const getDatatableTransformer = ({
  formatFactory,
}: {
  formatFactory: FormatFactory;
}): ExpressionFunctionDefinition<
  'lens_datatable_transformer',
  LensMultiTable,
  DatatableTransformerArgs,
  DatatableTransformerResult
> => ({
  name: 'lens_datatable_transformer',
  type: 'multiple_lens_multitable',
  inputTypes: ['lens_multitable'],
  help: '',
  args: {
    columns: {
      types: ['lens_datatable_column'],
      help: '',
      multi: true,
    },
    sortingColumnId: {
      types: ['string'],
      help: '',
    },
    sortingDirection: {
      types: ['string'],
      help: '',
    },
  },
  fn(data, args, context) {
    let untransposedData: LensMultiTable | undefined;
    // do the sorting at this level to propagate it also at CSV download
    const [firstTable] = Object.values(data.tables);
    const [layerId] = Object.keys(context.inspectorAdapters.tables || {});
    const formatters: Record<string, ReturnType<FormatFactory>> = {};

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
      // Sort on raw values for these types, while use the formatted value for the rest
      const sortingCriteria = getSortingCriteria(
        isRange(columnsReverseLookup[sortBy]?.meta)
          ? 'range'
          : columnsReverseLookup[sortBy]?.meta?.type,
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
    }
    return {
      type: 'multiple_lens_multitable',
      data,
      untransposedData,
      // columns have been manipulated by transpose, so export new columns config
      columns: args.columns,
    };
  },
});
