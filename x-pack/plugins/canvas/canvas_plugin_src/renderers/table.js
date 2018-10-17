/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import ReactDOM from 'react-dom';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { get } from 'lodash';
import { Datatable } from '../../public/components/datatable';

export const table = () => ({
  name: 'table',
  displayName: i18n.translate('xpack.canvas.renderers.tableDisplayName', {
    defaultMessage: 'Data table',
  }),
  help: i18n.translate('xpack.canvas.renderers.tableHelpText', {
    defaultMessage: 'Render tabular data as HTML',
  }),
  reuseDomNode: true,
  render(domNode, config, handlers) {
    const { datatable, paginate, perPage, font, showHeader } = config;
    ReactDOM.render(
      <div style={{ ...get(font, 'spec'), height: '100%' }}>
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
