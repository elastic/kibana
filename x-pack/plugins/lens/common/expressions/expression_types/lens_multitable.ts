/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExpressionTypeDefinition } from '@kbn/expressions-plugin/common';
import { LensMultiTable } from '../../types';

const name = 'lens_multitable';

type Input = LensMultiTable;

export type LensMultitableExpressionTypeDefinition = ExpressionTypeDefinition<
  typeof name,
  Input,
  Input
>;

export const lensMultitable: LensMultitableExpressionTypeDefinition = {
  name,
  to: {
    datatable: (input: Input) => {
      return Object.values(input.tables)[0];
    },
  },
};
