import {
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
  PluginInitializerContext,
  IRouter,
} from '@kbn/core/server';

import { KubernetesObservabilitySetupPlugins, KubernetesObservabilityStartPlugins } from './types';

import { registerRoutes } from './routes';

export class KubernetesObservabilityPlugin implements Plugin {
  private logger: Logger;
  private router: IRouter | undefined;

  /**
   * Initialize KubernetesObservabilityPlugin class properties (logger, etc) that is accessible
   * through the initializerContext.
   */
  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup, plugins: KubernetesObservabilitySetupPlugins) {
    this.logger.info('kubernetes observability: Setup');
    this.router = core.http.createRouter();
  }

  public start(core: CoreStart, plugins: KubernetesObservabilityStartPlugins) {
    this.logger.info('kubernetes observability: Start');

    // Register server routes
    if (this.router) {
      registerRoutes(this.router, this.logger, plugins.ruleRegistry);
    }
  }

  public stop() {
    this.logger.info('kubernetes observability: Stop');
  }
}
