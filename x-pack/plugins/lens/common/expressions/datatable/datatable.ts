/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ExecutionContext } from '../../../../../../src/plugins/expressions/common';
import type { FormatFactory } from '../../types';
import type { ColumnConfigArg } from './datatable_column';
import type { DatatableExpressionFunction } from './types';

export interface SortingState {
  columnId: string | undefined;
  direction: 'asc' | 'desc' | 'none';
}

export interface PagingState {
  size: number;
  enabled: boolean;
}

export interface DatatableArgs {
  title: string;
  description?: string;
  columns: ColumnConfigArg[];
  sortingColumnId: SortingState['columnId'];
  sortingDirection: SortingState['direction'];
  fitRowToContent?: boolean;
  rowHeightLines?: number;
  headerRowHeight?: 'auto' | 'single' | 'custom';
  headerRowHeightLines?: number;
  pageSize?: PagingState['size'];
}

export const getDatatable = (
  getFormatFactory: (context: ExecutionContext) => FormatFactory | Promise<FormatFactory>
): DatatableExpressionFunction => ({
  name: 'lens_datatable',
  type: 'render',
  inputTypes: ['lens_multitable'],
  help: i18n.translate('xpack.lens.datatable.expressionHelpLabel', {
    defaultMessage: 'Datatable renderer',
  }),
  args: {
    title: {
      types: ['string'],
      help: i18n.translate('xpack.lens.datatable.titleLabel', {
        defaultMessage: 'Title',
      }),
    },
    description: {
      types: ['string'],
      help: '',
    },
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
    fitRowToContent: {
      types: ['boolean'],
      help: '',
    },
    rowHeightLines: {
      types: ['number'],
      help: '',
    },
    headerRowHeight: {
      types: ['string'],
      help: '',
    },
    headerRowHeightLines: {
      types: ['number'],
      help: '',
    },
    pageSize: {
      types: ['number'],
      help: '',
    },
  },
  async fn(...args) {
    /** Build optimization: prevent adding extra code into initial bundle **/
    const { datatableFn } = await import('./datatable_fn');
    return datatableFn(getFormatFactory)(...args);
  },
});
