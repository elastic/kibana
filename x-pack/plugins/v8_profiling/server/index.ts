import { schema } from '@kbn/config-schema';

import { PluginInitializerContext, CoreSetup, CoreStart, Logger } from '@kbn/core/server';

import { registerRoutes } from './routes';

export const config = {
  schema: schema.object({
    enabled: schema.boolean({ defaultValue: true }),
  }),
};

export function plugin(initializerContext: PluginInitializerContext) {
  return new Plugin(initializerContext);
}

export class Plugin {
  readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  setup(core: CoreSetup) {
    const router = core.http.createRouter();
    registerRoutes(this, router);
  }

  start(core: CoreStart) {}

  async stop() {}
}
