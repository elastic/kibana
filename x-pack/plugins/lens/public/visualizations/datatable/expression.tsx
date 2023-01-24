/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { i18n } from '@kbn/i18n';
import { I18nProvider } from '@kbn/i18n-react';
import type { PaletteRegistry } from '@kbn/coloring';
import type { IAggType } from '@kbn/data-plugin/public';
import { IUiSettingsClient, ThemeServiceStart } from '@kbn/core/public';
import type {
  Datatable,
  ExpressionRenderDefinition,
  IInterpreterRenderHandlers,
} from '@kbn/expressions-plugin/common';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { trackUiCounterEvents } from '../../lens_ui_telemetry';
import { DatatableComponent } from './components/table_basic';

import type {
  GetCompatibleCellValueActions,
  ILensInterpreterRenderHandlers,
  LensCellValueAction,
} from '../../types';
import type { FormatFactory } from '../../../common';
import type { DatatableProps } from '../../../common/expressions';

async function getColumnsFilterable(table: Datatable, handlers: IInterpreterRenderHandlers) {
  if (!table.rows.length) {
    return;
  }
  return Promise.all(
    table.columns.map(async (column, colIndex) => {
      return Boolean(
        await handlers.hasCompatibleActions?.({
          name: 'filter',
          data: {
            data: [
              {
                table,
                column: colIndex,
                row: 0,
              },
            ],
          },
        })
      );
    })
  );
}

/**
 * Retrieves the compatible CELL_VALUE_TRIGGER actions indexed by column
 **/
export async function getColumnCellValueActions(
  config: DatatableProps,
  getCompatibleCellValueActions?: ILensInterpreterRenderHandlers['getCompatibleCellValueActions']
): Promise<LensCellValueAction[][]> {
  if (!config.data || !getCompatibleCellValueActions) {
    return [];
  }
  return Promise.all(
    config.data.columns.map(({ meta: columnMeta }) => {
      try {
        return (getCompatibleCellValueActions as GetCompatibleCellValueActions)([{ columnMeta }]);
      } catch {
        return [];
      }
    })
  );
}

export const getDatatableRenderer = (dependencies: {
  formatFactory: FormatFactory;
  getType: Promise<(name: string) => IAggType>;
  paletteService: PaletteRegistry;
  uiSettings: IUiSettingsClient;
  theme: ThemeServiceStart;
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
    handlers.onDestroy(() => ReactDOM.unmountComponentAtNode(domNode));

    const resolvedGetType = await dependencies.getType;
    const { hasCompatibleActions, isInteractive, getCompatibleCellValueActions } = handlers;

    const renderComplete = () => {
      trackUiCounterEvents('table', handlers.getExecutionContext());
      handlers.done();
    };

    // An entry for each table row, whether it has any actions attached to
    // ROW_CLICK_TRIGGER trigger.
    let rowHasRowClickTriggerActions: boolean[] = [];
    if (hasCompatibleActions) {
      if (!!config.data) {
        rowHasRowClickTriggerActions = await Promise.all(
          config.data.rows.map(async (row, rowIndex) => {
            try {
              const hasActions = await hasCompatibleActions({
                name: 'tableRowContextMenuClick',
                data: {
                  rowIndex,
                  table: config.data,
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

    const [columnCellValueActions, columnsFilterable] = await Promise.all([
      getColumnCellValueActions(config, getCompatibleCellValueActions),
      getColumnsFilterable(config.data, handlers),
    ]);

    ReactDOM.render(
      <KibanaThemeProvider theme$={dependencies.theme.theme$}>
        <I18nProvider>
          <DatatableComponent
            {...config}
            formatFactory={dependencies.formatFactory}
            dispatchEvent={handlers.event}
            renderMode={handlers.getRenderMode()}
            paletteService={dependencies.paletteService}
            getType={resolvedGetType}
            rowHasRowClickTriggerActions={rowHasRowClickTriggerActions}
            columnCellValueActions={columnCellValueActions}
            columnFilterable={columnsFilterable}
            interactive={isInteractive()}
            uiSettings={dependencies.uiSettings}
            renderComplete={renderComplete}
          />
        </I18nProvider>
      </KibanaThemeProvider>,
      domNode
    );
  },
});
