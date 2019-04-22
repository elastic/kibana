/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerRoutes } from './routes'
import { CoreSetup } from 'src/core/server';

export class Plugin {
  public setup(core: CoreSetup) {
    registerRoutes(core);
  }
}
