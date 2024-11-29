import type {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '@kbn/core/server';

import type { AssetInventoryPluginSetup, AssetInventoryPluginStart } from './types';
import { defineRoutes } from './routes';

export class AssetInventoryPlugin
  implements Plugin<AssetInventoryPluginSetup, AssetInventoryPluginStart>
{
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup) {
    this.logger.debug('assetInventory: Setup');
    const router = core.http.createRouter();

    // Register server side APIs
    defineRoutes(router);

    return {};
  }

  public start(core: CoreStart) {
    this.logger.debug('assetInventory: Started');
    return {};
  }

  public stop() {}
}
