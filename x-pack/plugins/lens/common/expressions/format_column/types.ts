/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Datatable,
  ExpressionFunctionDefinition,
} from '../../../../../../src/plugins/expressions';
import type { FormatColumnArgs } from './index';

export type FormatColumnExpressionFunction = ExpressionFunctionDefinition<
  'lens_format_column',
  Datatable,
  FormatColumnArgs,
  Datatable | Promise<Datatable>
>;
