/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ExpressionFunctionDefinition } from '../../../../../../src/plugins/expressions/common';
import type { DatatableTransformerResult, DatatableTransformerArgs } from './datatable_transformer';

export type DatatableProps = Omit<DatatableTransformerResult, 'type' | 'columns'> & {
  args: DatatableArgs;
};

export interface DatatableRender {
  type: 'render';
  as: 'lens_datatable_renderer';
  value: DatatableProps;
}

interface DatatableRendererArgs extends Omit<DatatableTransformerArgs, 'columns'> {
  title: string;
  description?: string;
}

export interface DatatableArgs extends DatatableTransformerArgs {
  title: string;
  description?: string;
}

export const datatable: ExpressionFunctionDefinition<
  'lens_datatable',
  DatatableTransformerResult,
  DatatableRendererArgs,
  DatatableRender
> = {
  name: 'lens_datatable',
  type: 'render',
  inputTypes: ['multiple_lens_multitable'],
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
    sortingColumnId: {
      types: ['string'],
      help: '',
    },
    sortingDirection: {
      types: ['string'],
      help: '',
    },
  },
  fn({ data, untransposedData, columns }, args, context) {
    const [firstTable] = Object.values(data.tables);
    const { sortingColumnId: sortBy, sortingDirection: sortDirection } = args;

    if (
      !sortBy ||
      sortDirection === 'none' ||
      !firstTable.columns.some(({ id }) => id === sortBy)
    ) {
      args.sortingColumnId = undefined;
      args.sortingDirection = 'none';
    }
    return {
      type: 'render',
      as: 'lens_datatable_renderer',
      value: {
        data,
        untransposedData,
        args: {
          ...args,
          columns,
        },
      },
    };
  },
};
