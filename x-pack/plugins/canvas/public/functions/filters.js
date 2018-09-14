/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fromExpression } from '../../common/lib/ast';
import { typesRegistry } from '../../common/lib/types_registry';
import { getState } from '../state/store';
import { getGlobalFilterExpression } from '../state/selectors/workpad';
import { interpretAst } from '../lib/interpreter';

export const filters = () => ({
  name: 'filters',
  type: 'filter',
  context: {
    types: ['null'],
  },
  help: 'Collect element filters on the workpad, usually to provide them to a data source',
  fn: () => {
    const filterExpression = getGlobalFilterExpression(getState());

    if (filterExpression && filterExpression.length) {
      const filterAST = fromExpression(filterExpression);
      return interpretAst(filterAST);
    } else {
      const filterType = typesRegistry.get('filter');
      return filterType.from(null);
    }
  },
});
