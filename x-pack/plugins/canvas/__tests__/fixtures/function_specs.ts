/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { functions as browserFns } from '../../canvas_plugin_src/functions/browser';
import { ExpressionFunction } from '../../../../../src/plugins/expressions';
import { initFunctions } from '../../public/functions';

export const functionSpecs = browserFns
  .concat(...(initFunctions({} as any) as any))
  .map((fn) => new ExpressionFunction(fn()));
