/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { KibanaFramework } from './lib/kibana_framework';
import { registerGrokdebuggerRoutes } from './routes/api/grokdebugger';

export const config = {
  schema: schema.object({
    enabled: schema.boolean({ defaultValue: true }),
  }),
};

export class Plugin {
  constructor(initializerContext) {
    this.config$ = initializerContext.config.create();
  }

  setup(coreSetup) {
    console.log('STARTING: Grok Debugger');
    // TODO: Add license checking setup
    const framework = new KibanaFramework(coreSetup);
    registerGrokdebuggerRoutes(framework);
  }

  start() {}

  stop() {}
}
