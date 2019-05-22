/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore - Interpreter not typed yet
import { fromExpression, toExpression } from '@kbn/interpreter/common';
import { get } from 'lodash';
import React from 'react';
import ReactDOM from 'react-dom';
import { RendererFactory } from '../types';
import { DropdownFilter } from './component';

interface Config {
  /** The column to use within the exactly function */
  column: string;
  /**
   * A collection of choices to display in the dropdown
   * @default []
   */
  choices: string[];
}

export const dropdownFilter: RendererFactory<Config> = () => ({
  name: 'dropdown_filter',
  displayName: 'Dropdown filter',
  help: 'A dropdown from which you can select values for an "exactly" filter',
  reuseDomNode: true,
  height: 50,
  render(domNode, config, handlers) {
    const { column, choices } = config;
    let value = '%%CANVAS_MATCH_ALL%%';
    if (handlers.getFilter() !== '') {
      const filterAST = fromExpression(handlers.getFilter());
      value = get(filterAST, 'chain[0].arguments.value[0]');
    }

    const commit = (commitValue: string) => {
      if (commitValue === '%%CANVAS_MATCH_ALL%%') {
        handlers.setFilter('');
      } else {
        const newFilterAST = {
          type: 'expression',
          chain: [
            {
              type: 'function',
              function: 'exactly',
              arguments: {
                value: [commitValue],
                column: [column],
              },
            },
          ],
        };

        const filter = toExpression(newFilterAST);
        handlers.setFilter(filter);
      }
    };

    ReactDOM.render(
      <DropdownFilter commit={commit} choices={choices || []} value={value} />,
      domNode,
      () => handlers.done()
    );

    handlers.onDestroy(() => {
      ReactDOM.unmountComponentAtNode(domNode);
    });
  },
});
