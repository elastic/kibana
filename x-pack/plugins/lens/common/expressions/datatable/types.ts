/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExpressionFunctionDefinition } from '../../../../../../src/plugins/expressions';
import type { LensMultiTable } from '../../types';
import type { DatatableArgs, DatatableRender } from './datatable';

export type DatatableExpressionFunction = ExpressionFunctionDefinition<
  'lens_datatable',
  LensMultiTable,
  DatatableArgs,
  Promise<DatatableRender>
>;
