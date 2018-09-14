import ReactDOM from 'react-dom';
import React from 'react';
import { get } from 'lodash';
import { Datatable } from '../../public/components/datatable';

export const table = () => ({
  name: 'table',
  displayName: 'Data Table',
  help: 'Render tabular data as HTML',
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
