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
import type { IAggType } from 'src/plugins/data/public';
import { IUiSettingsClient, ThemeServiceStart } from 'kibana/public';
import { ExpressionRenderDefinition } from 'src/plugins/expressions';
import { KibanaThemeProvider } from '../../../../../src/plugins/kibana_react/public';
import { DatatableComponent } from './components/table_basic';

import type { ILensInterpreterRenderHandlers } from '../types';
import type { FormatFactory } from '../../common';
import type { DatatableProps } from '../../common/expressions';

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
    const resolvedGetType = await dependencies.getType;
    const { hasCompatibleActions, isInteractive } = handlers;

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
            interactive={isInteractive()}
            uiSettings={dependencies.uiSettings}
          />
        </I18nProvider>
      </KibanaThemeProvider>,
      domNode,
      () => {
        handlers.done();
      }
    );
    handlers.onDestroy(() => ReactDOM.unmountComponentAtNode(domNode));
  },
});
