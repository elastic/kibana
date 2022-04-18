/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ExpressionValueFilter,
  ExpressionAstExpression,
  ExpressionAstFunction,
} from '@kbn/expressions-plugin';
import { fromExpression } from '@kbn/interpreter';
import { buildFiltersFunction } from '../../../common/functions';
import type { FiltersFunction } from '../../../common/functions';

/* 
  Expression function `filters` can't be used on the server, because it is tightly coupled with the redux store. 
  It is replaced with `kibana | selectFilter`.
  
  Current filters function definition is used only for the purpose of enabling migrations.
  The function has to be registered on the server while the plugin's setup, to be able to run its migration.
*/
const filtersFn = (): ExpressionValueFilter => ({
  type: 'filter',
  and: [],
});

const migrations: FiltersFunction['migrations'] = {
  '8.1.0': (ast: ExpressionAstFunction): ExpressionAstFunction | ExpressionAstExpression => {
    const SELECT_FILTERS = 'selectFilter';
    const newExpression = `kibana | ${SELECT_FILTERS}`;
    const newAst: ExpressionAstExpression = fromExpression(newExpression);
    const selectFiltersAstIndex = newAst.chain.findIndex(
      ({ function: fnName }) => fnName === SELECT_FILTERS
    );
    const selectFilterAst = newAst.chain[selectFiltersAstIndex];
    newAst.chain.splice(selectFiltersAstIndex, 1, { ...selectFilterAst, arguments: ast.arguments });
    return newAst;
  },
};

export const filters = buildFiltersFunction(filtersFn, migrations);
