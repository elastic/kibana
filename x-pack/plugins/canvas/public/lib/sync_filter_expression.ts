/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fromExpression } from '@kbn/interpreter/common';
import immutable from 'object-path-immutable';
import { get } from 'lodash';

const { set, del } = immutable;

export function syncFilterExpression(
  config: Record<string, any>,
  filterExpression: string,
  fields: string[] = []
) {
  let changed = false;
  const filterAst = fromExpression(filterExpression);

  const newAst = fields.reduce((ast, field) => {
    const val = get(ast, `chain[0].arguments.${field}[0]`);

    if (val !== config[field]) {
      changed = true;
      if (!config[field]) {
        // remove value if not in expression
        return del(ast, `chain.0.arguments.${field}`);
      }
      return set(ast, `chain.0.arguments.${field}.0`, config[field]);
    }

    return ast;
  }, filterAst);

  return { changed, newAst };
}
