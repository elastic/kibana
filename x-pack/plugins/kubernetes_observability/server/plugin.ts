import {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '@kbn/core/server';

import { KubernetesObservabilityPluginSetup, KubernetesObservabilityPluginStart } from './types';
import { defineRoutes } from './routes';

export class KubernetesObservabilityPlugin
  implements Plugin<KubernetesObservabilityPluginSetup, KubernetesObservabilityPluginStart>
{
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup) {
    this.logger.debug('kubernetesObservability: Setup');
    const router = core.http.createRouter();

    // Register server side APIs
    defineRoutes(router);

    return {};
  }

  public start(core: CoreStart) {
    this.logger.debug('kubernetesObservability: Started');
    return {};
  }

  public stop() {}
}
