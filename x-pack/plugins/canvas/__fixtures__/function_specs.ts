/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { functions as browserFns } from '../canvas_plugin_src/functions/browser';
import { ExpressionFunction } from '../../../../src/plugins/expressions';
import { initFunctions } from '../public/functions';
import { functionSpecs as shapeFunctionSpecs } from '../../../../src/plugins/expression_shape/__fixtures__';
import { functionSpecs as imageFunctionSpecs } from '../../../../src/plugins/expression_image/__fixtures__';
import { functionSpecs as metricFunctionSpecs } from '../../../../src/plugins/expression_metric/__fixtures__';

export const functionSpecs = browserFns
  .concat(...(initFunctions({} as any) as any))
  .map((fn) => new ExpressionFunction(fn()))
  .concat(...shapeFunctionSpecs, ...imageFunctionSpecs, ...metricFunctionSpecs);
