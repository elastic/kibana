/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Datatable,
  ExpressionTypeDefinition,
} from '../../../../../../src/plugins/expressions/common';
import { LensMultiTable } from '../../types';

const name = 'first_datatable';

type Input = LensMultiTable | Datatable;

export type FirstDatatableExpressionTypeDefinition = ExpressionTypeDefinition<
  typeof name,
  Input,
  Input
>;

export const firstDatatable: FirstDatatableExpressionTypeDefinition = {
  name,
  to: {
    datatable: (input: Input) => {
      return input.type === 'datatable' ? input : Object.values(input.tables)[0];
    },
  },
};
