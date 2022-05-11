/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Datatable, ExpressionFunctionDefinition } from '@kbn/expressions-plugin';
import { CounterRateArgs } from '.';

export type CounterRateExpressionFunction = ExpressionFunctionDefinition<
  'lens_counter_rate',
  Datatable,
  CounterRateArgs,
  Datatable | Promise<Datatable>
>;
