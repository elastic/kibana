/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pick, keys, values, some } from 'lodash';
import { cellHasFormulas } from './cell_has_formula';

interface IFlattened {
  [header: string]: string;
}

export const checkIfRowsHaveFormulas = (flattened: IFlattened, fields: string[]) => {
  const pruned = pick(flattened, fields);
  const cells = [...keys(pruned), ...(values(pruned) as string[])];

  return some(cells, (cell) => cellHasFormulas(cell));
};
