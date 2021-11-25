/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExpressionValueFilter } from 'src/plugins/expressions';
import { Ast, fromExpression } from '@kbn/interpreter/common';
import { buildFiltersFunction } from '../../../common/functions';
import type { FiltersFunction } from '../../../common/functions';

const filtersFn = (): ExpressionValueFilter => ({
  type: 'filter',
  and: [],
});

const migrations: FiltersFunction['migrations'] = {
  '8.1.0': (ast: Ast): Ast => {
    const newExpression = 'kibana | selectFilter';
    const newAst = fromExpression(newExpression);
    return newAst;
  },
};

export const filters = buildFiltersFunction(filtersFn, migrations);
