/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Datatable, ExpressionFunctionDefinition } from '@kbn/expressions-plugin';

export type TimeScaleUnit = 's' | 'm' | 'h' | 'd';

export interface TimeScaleArgs {
  dateColumnId: string;
  inputColumnId: string;
  outputColumnId: string;
  targetUnit: TimeScaleUnit;
  outputColumnName?: string;
}

export type TimeScaleExpressionFunction = ExpressionFunctionDefinition<
  'lens_time_scale',
  Datatable,
  TimeScaleArgs,
  Promise<Datatable>
>;
