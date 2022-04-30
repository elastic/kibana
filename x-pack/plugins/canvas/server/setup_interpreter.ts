/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExpressionsServerSetup } from 'src/plugins/expressions/server';
import { functions } from '../canvas_plugin_src/functions/server';
import {
  initFunctions as initExternalFunctions,
  InitializeArguments,
} from '../canvas_plugin_src/functions/external';

export function setupInterpreter(
  expressions: ExpressionsServerSetup,
  dependencies: InitializeArguments
) {
  functions.forEach((f) => expressions.registerFunction(f));
  initExternalFunctions(dependencies).forEach((f) => expressions.registerFunction(f));
}
