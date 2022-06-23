/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import ReactDOM from 'react-dom';
import React from 'react';
import { CoreTheme } from '@kbn/core/public';
import { Observable } from 'rxjs';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { defaultTheme$ } from '@kbn/presentation-util-plugin/common/lib';
import { StartInitializer } from '../plugin';
import { Datatable as DatatableComponent } from '../../public/components/datatable';
import { RendererStrings } from '../../i18n';
import { RendererFactory, Style, Datatable } from '../../types';

const { dropdownFilter: strings } = RendererStrings;
export interface TableArguments {
  font?: Style;
  paginate: boolean;
  perPage: number;
  showHeader: boolean;
  datatable: Datatable;
}

export const getTableRenderer =
  (theme$: Observable<CoreTheme> = defaultTheme$): RendererFactory<TableArguments> =>
  () => ({
    name: 'table',
    displayName: strings.getDisplayName(),
    help: strings.getHelpDescription(),
    reuseDomNode: true,
    render(domNode, config, handlers) {
      const { datatable, paginate, perPage, font = { spec: {} }, showHeader } = config;
      ReactDOM.render(
        <KibanaThemeProvider theme$={theme$}>
          <div style={{ ...(font.spec as React.CSSProperties), height: '100%' }}>
            <DatatableComponent
              datatable={datatable}
              perPage={perPage}
              paginate={paginate}
              showHeader={showHeader}
            />
          </div>
        </KibanaThemeProvider>,
        domNode,
        () => handlers.done()
      );
      handlers.onDestroy(() => ReactDOM.unmountComponentAtNode(domNode));
    },
  });

export const tableFactory: StartInitializer<RendererFactory<TableArguments>> = (core, plugins) =>
  getTableRenderer(core.theme.theme$);
