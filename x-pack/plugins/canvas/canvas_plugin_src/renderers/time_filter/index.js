/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import ReactDOM from 'react-dom';
import React from 'react';
import { get, set } from 'lodash';
import { fromExpression, toExpression } from '../../../common/lib/ast';
import { TimeFilter } from './components/time_filter';

export const timeFilter = () => ({
  name: 'time_filter',
  displayName: 'Time filter',
  help: 'Set a time window',
  reuseDomNode: true,
  render(domNode, config, handlers) {
    const ast = fromExpression(handlers.getFilter());

    // Check if the current column is what we expect it to be. If the user changes column this will be called again,
    // but we don't want to run setFilter() unless we have to because it will cause a data refresh
    const column = get(ast, 'chain[0].arguments.column[0]');
    if (column !== config.column) {
      set(ast, 'chain[0].arguments.column[0]', config.column);
      handlers.setFilter(toExpression(ast));
    }

    ReactDOM.render(
      <TimeFilter
        compact={config.compact}
        commit={handlers.setFilter}
        filter={toExpression(ast)}
      />,
      domNode,
      () => handlers.done()
    );

    handlers.onDestroy(() => {
      handlers.setFilter('');
      ReactDOM.unmountComponentAtNode(domNode);
    });
  },
});
