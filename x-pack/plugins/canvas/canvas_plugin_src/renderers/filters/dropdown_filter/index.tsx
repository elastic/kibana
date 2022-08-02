/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromExpression, toExpression, Ast } from '@kbn/interpreter';
import { get } from 'lodash';
import React from 'react';
import ReactDOM from 'react-dom';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { syncFilterExpression } from '../../../../public/lib/sync_filter_expression';
import { RendererFactory } from '../../../../types';
import { StartInitializer } from '../../../plugin';
import { DropdownFilter } from './component';
import { RendererStrings } from '../../../../i18n';

const { dropdownFilter: strings } = RendererStrings;

export interface Config {
  /** The column to use within the exactly function */
  column: string;
  /**
   * A collection of choices to display in the dropdown
   * @default []
   */
  choices: Array<[string, string]>;
  filterGroup: string;
}

const MATCH_ALL = '%%CANVAS_MATCH_ALL%%';

const getFilterValue = (filterExpression: string) => {
  if (filterExpression === '') {
    return MATCH_ALL;
  }

  const filterAST = fromExpression(filterExpression);
  return get(filterAST, 'chain[0].arguments.value[0]', MATCH_ALL) as string;
};

export const dropdownFilterFactory: StartInitializer<RendererFactory<Config>> =
  (core, plugins) => () => ({
    name: 'dropdown_filter',
    displayName: strings.getDisplayName(),
    help: strings.getHelpDescription(),
    reuseDomNode: true,
    height: 50,
    render(domNode, config, handlers) {
      let filterExpression = handlers.getFilter();

      if (
        filterExpression !== '' &&
        (filterExpression === undefined || !filterExpression.includes('exactly'))
      ) {
        filterExpression = '';
        handlers.event({ name: 'applyFilterAction', data: filterExpression });
      } else if (filterExpression !== '') {
        // NOTE: setFilter() will cause a data refresh, avoid calling unless required
        // compare expression and filter, update filter if needed
        const { changed, newAst } = syncFilterExpression(config, filterExpression, ['filterGroup']);

        if (changed) {
          handlers.event({ name: 'applyFilterAction', data: toExpression(newAst) });
        }
      }
      const commit = (commitValue: string) => {
        if (commitValue === '%%CANVAS_MATCH_ALL%%') {
          handlers.event({ name: 'applyFilterAction', data: '' });
        } else {
          const newFilterAST: Ast = {
            type: 'expression',
            chain: [
              {
                type: 'function',
                function: 'exactly',
                arguments: {
                  value: [commitValue],
                  column: [config.column],
                  filterGroup: [config.filterGroup],
                },
              },
            ],
          };

          const newFilter = toExpression(newFilterAST);
          handlers.event({ name: 'applyFilterAction', data: newFilter });
        }
      };
      const filter = (
        <DropdownFilter
          commit={commit}
          choices={config.choices || []}
          initialValue={getFilterValue(filterExpression)}
        />
      );

      ReactDOM.render(
        <KibanaThemeProvider theme$={core.theme.theme$}>{filter}</KibanaThemeProvider>,
        domNode,
        () => handlers.done()
      );

      handlers.onDestroy(() => {
        ReactDOM.unmountComponentAtNode(domNode);
      });
    },
  });
