/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { interpretAst } from 'plugins/interpreter/interpreter';
import { registries } from 'plugins/interpreter/registries';
import { fromExpression } from '@kbn/interpreter/common';
import { get } from 'lodash';
import { getState } from '../state/store';
import { getGlobalFilters } from '../state/selectors/workpad';

function getFiltersByGroup(filters, groups = []) {
  if (!groups || groups.length === 0) {
    return filters;
  }

  return filters.filter(filter => {
    const ast = fromExpression(filter);
    const expGroups = get(ast, 'chain[0].arguments.filterGroup', []);
    return expGroups.length > 0 && expGroups.every(expGroup => groups.includes(expGroup));
  });
}

export const filters = () => ({
  name: 'filters',
  type: 'filter',
  context: {
    types: ['null'],
  },
  args: {
    group: {
      aliases: ['_'],
      types: ['string'],
      help: 'The name of the filter group to use',
      multi: true,
    },
  },
  help: 'Collect element filters on the workpad, usually to provide them to a data source',
  fn: (_, { group }) => {
    const filterList = getFiltersByGroup(getGlobalFilters(getState()), group);

    if (filterList && filterList.length) {
      const filterExpression = filterList.join(' | ');
      const filterAST = fromExpression(filterExpression);
      return interpretAst(filterAST);
    } else {
      const filterType = registries.types.get('filter');
      return filterType.from(null);
    }
  },
});
