/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExpressionsServerSetup } from 'src/plugins/expressions/server';
import { EmbeddableSetup } from 'src/plugins/embeddable/server';
import { functions } from '../canvas_plugin_src/functions/server';
import { initFunctions as initExternalFunctions } from '../canvas_plugin_src/functions/external';

interface InterpreterDependencies {
  embeddablesService: EmbeddableSetup;
}

export function setupInterpreter(
  expressions: ExpressionsServerSetup,
  dependencies: InterpreterDependencies
) {
  functions.forEach((f) => expressions.registerFunction(f));
  externalFunctions.forEach((f) => expressions.registerFunction(f));
}
