/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import ReactDOM from 'react-dom';
import React from 'react';
import { get } from 'lodash';
import { fromExpression, toExpression } from '../../../common/lib/ast';
import { DropdownFilter } from './component';

export const dropdownFilter = () => ({
  name: 'dropdown_filter',
  displayName: 'Dropdown filter',
  help: 'A dropdown from which you can select values for an "exactly" filter',
  reuseDomNode: true,
  height: 50,
  render(domNode, config, handlers) {
    let value = '%%CANVAS_MATCH_ALL%%';
    if (handlers.getFilter() !== '') {
      const filterAST = fromExpression(handlers.getFilter());
      value = get(filterAST, 'chain[0].arguments.value[0]');
    }

    const commit = value => {
      if (value === '%%CANVAS_MATCH_ALL%%') {
        handlers.setFilter('');
      } else {
        const newFilterAST = {
          type: 'expression',
          chain: [
            {
              type: 'function',
              function: 'exactly',
              arguments: {
                value: [value],
                column: [config.column],
              },
            },
          ],
        };

        const filter = toExpression(newFilterAST);
        handlers.setFilter(filter);
      }
    };

    // Get choices
    const choices = config.choices;

    ReactDOM.render(
      <DropdownFilter commit={commit} choices={choices || []} value={value} />,
      domNode,
      () => handlers.done()
    );

    handlers.onDestroy(() => {
      handlers.setFilter('');
      ReactDOM.unmountComponentAtNode(domNode);
    });
  },
});
