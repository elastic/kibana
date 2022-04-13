/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExpressionFunctionDefinition } from '../../../../../../src/plugins/expressions';
import { LensMultiTable } from '../../types';
import { CollapseArgs } from './index';

export type CollapseExpressionFunction = ExpressionFunctionDefinition<
  'lens_collapse',
  LensMultiTable,
  CollapseArgs,
  LensMultiTable | Promise<LensMultiTable>
>;
