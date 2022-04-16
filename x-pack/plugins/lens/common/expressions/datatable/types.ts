/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExpressionFunctionDefinition } from '@kbn/expressions-plugin';
import type { LensMultiTable } from '../../types';
import type { DatatableArgs } from './datatable';

export interface DatatableProps {
  data: LensMultiTable;
  untransposedData?: LensMultiTable;
  args: DatatableArgs;
}

export interface DatatableRender {
  type: 'render';
  as: 'lens_datatable_renderer';
  value: DatatableProps;
}

export type DatatableExpressionFunction = ExpressionFunctionDefinition<
  'lens_datatable',
  LensMultiTable,
  DatatableArgs,
  Promise<DatatableRender>
>;
