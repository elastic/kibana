/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { cloneDeep } from 'lodash';
import { i18n } from '@kbn/i18n';
import { I18nProvider } from '@kbn/i18n/react';

import type { IAggType } from 'src/plugins/data/public';
import {
  DatatableColumnMeta,
  ExpressionFunctionDefinition,
  ExpressionRenderDefinition,
} from 'src/plugins/expressions';
import { getSortingCriteria } from './sorting';

import { DatatableComponent } from './components/table_basic';
import { ColumnState } from './visualization';

import type { FormatFactory, ILensInterpreterRenderHandlers, LensMultiTable } from '../types';
import type { DatatableRender } from './components/types';
import { transposeTable } from './transpose_helpers';

export interface Args {
  title: string;
  description?: string;
  columns: Array<ColumnState & { type: 'lens_datatable_column' }>;
  sortingColumnId: string | undefined;
  sortingDirection: 'asc' | 'desc' | 'none';
}

export interface DatatableProps {
  data: LensMultiTable;
  untransposedData?: LensMultiTable;
  args: Args;
}

function isRange(meta: { params?: { id?: string } } | undefined) {
  return meta?.params?.id === 'range';
}

export const getDatatable = ({
  formatFactory,
}: {
  formatFactory: FormatFactory;
}): ExpressionFunctionDefinition<'lens_datatable', LensMultiTable, Args, DatatableRender> => ({
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
  },
});

type DatatableColumnResult = ColumnState & { type: 'lens_datatable_column' };

export const datatableColumn: ExpressionFunctionDefinition<
  'lens_datatable_column',
  null,
  ColumnState,
  DatatableColumnResult
> = {
  name: 'lens_datatable_column',
  aliases: [],
  type: 'lens_datatable_column',
  help: '',
  inputTypes: ['null'],
  args: {
    columnId: { types: ['string'], help: '' },
    alignment: { types: ['string'], help: '' },
    hidden: { types: ['boolean'], help: '' },
    width: { types: ['number'], help: '' },
    isTransposed: { types: ['boolean'], help: '' },
    transposable: { types: ['boolean'], help: '' },
  },
  fn: function fn(input: unknown, args: ColumnState) {
    return {
      type: 'lens_datatable_column',
      ...args,
    };
  },
};

export const getDatatableRenderer = (dependencies: {
  formatFactory: FormatFactory;
  getType: Promise<(name: string) => IAggType>;
}): ExpressionRenderDefinition<DatatableProps> => ({
  name: 'lens_datatable_renderer',
  displayName: i18n.translate('xpack.lens.datatable.visualizationName', {
    defaultMessage: 'Datatable',
  }),
  help: '',
  validate: () => undefined,
  reuseDomNode: true,
  render: async (
    domNode: Element,
    config: DatatableProps,
    handlers: ILensInterpreterRenderHandlers
  ) => {
    const resolvedGetType = await dependencies.getType;
    const { hasCompatibleActions } = handlers;

    // An entry for each table row, whether it has any actions attached to
    // ROW_CLICK_TRIGGER trigger.
    let rowHasRowClickTriggerActions: boolean[] = [];
    if (hasCompatibleActions) {
      const table = Object.values(config.data.tables)[0];
      if (!!table) {
        rowHasRowClickTriggerActions = await Promise.all(
          table.rows.map(async (row, rowIndex) => {
            try {
              const hasActions = await hasCompatibleActions({
                name: 'tableRowContextMenuClick',
                data: {
                  rowIndex,
                  table,
                  columns: config.args.columns.map((column) => column.columnId),
                },
              });

              return hasActions;
            } catch {
              return false;
            }
          })
        );
      }
    }

    ReactDOM.render(
      <I18nProvider>
        <DatatableComponent
          {...config}
          formatFactory={dependencies.formatFactory}
          dispatchEvent={handlers.event}
          renderMode={handlers.getRenderMode()}
          getType={resolvedGetType}
          rowHasRowClickTriggerActions={rowHasRowClickTriggerActions}
        />
      </I18nProvider>,
      domNode,
      () => {
        handlers.done();
      }
    );
    handlers.onDestroy(() => ReactDOM.unmountComponentAtNode(domNode));
  },
});
