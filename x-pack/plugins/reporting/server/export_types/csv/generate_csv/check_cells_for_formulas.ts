/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick, keys, values, some } from 'lodash';
import { cellHasFormulas } from '../../../../../../../src/plugins/data/common';

interface IFlattened {
  [header: string]: string;
}

export const checkIfRowsHaveFormulas = (flattened: IFlattened, fields: string[]) => {
  const pruned = pick(flattened, fields);
  const cells = [...keys(pruned), ...(values(pruned) as string[])];

  return some(cells, (cell) => cellHasFormulas(cell));
};
