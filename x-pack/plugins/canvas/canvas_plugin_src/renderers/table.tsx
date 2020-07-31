/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import ReactDOM from 'react-dom';
import React from 'react';
import { Datatable } from '../../public/components/datatable';
import { Return as Arguments } from '../functions/common/table';
import { RendererStrings } from '../../i18n';
import { RendererFactory } from '../../types';

const { dropdownFilter: strings } = RendererStrings;

export const table: RendererFactory<Arguments> = () => ({
  name: 'table',
  displayName: strings.getDisplayName(),
  help: strings.getHelpDescription(),
  reuseDomNode: true,
  render(domNode, config, handlers) {
    const { datatable, paginate, perPage, font, showHeader } = config;
    ReactDOM.render(
      <div style={{ ...(font.spec as React.CSSProperties), height: '100%' }}>
        <Datatable
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
