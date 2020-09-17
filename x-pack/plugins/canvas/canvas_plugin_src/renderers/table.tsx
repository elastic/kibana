/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import ReactDOM from 'react-dom';
import React from 'react';
import { Datatable as DatatableComponent } from '../../public/components/datatable';
import { RendererStrings } from '../../i18n';
import { RendererFactory, Style, Datatable } from '../../types';

const { dropdownFilter: strings } = RendererStrings;

interface TableArguments {
  font?: Style;
  paginate: boolean;
  perPage: number;
  showHeader: boolean;
  datatable: Datatable;
}

export const table: RendererFactory<TableArguments> = () => ({
  name: 'table',
  displayName: strings.getDisplayName(),
  help: strings.getHelpDescription(),
  reuseDomNode: true,
  render(domNode, config, handlers) {
    const { datatable, paginate, perPage, font = { spec: {} }, showHeader } = config;
    ReactDOM.render(
      <div style={{ ...(font.spec as React.CSSProperties), height: '100%' }}>
        <DatatableComponent
          datatable={datatable}
          perPage={perPage}
          paginate={paginate}
          showHeader={showHeader}
        />
      </div>,
      domNode,
      () => handlers.done()
    );

    handlers.onDestroy(() => ReactDOM.unmountComponentAtNode(domNode));
  },
});
