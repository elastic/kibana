/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExpressionsServerSetup } from 'src/plugins/expressions/server';
import { functions } from '../canvas_plugin_src/functions/server';

export function setupInterpreter(expressions: ExpressionsServerSetup) {
  expressions.__LEGACY.register({ types: [], serverFunctions: functions });
}
