import { PluginInitializerContext, CoreSetup, CoreStart, Plugin, Logger } from 'src/core/server';

import { RacPluginSetup, RacPluginStart } from './types';
import { defineRoutes } from './routes';
import { createEsContext, EsContext } from './es/context';

export class RacPlugin implements Plugin<RacPluginSetup, RacPluginStart> {
  private readonly logger: Logger;
  private readonly kibanaVersion: PluginInitializerContext['env']['packageInfo']['version'];
  private esContext?: EsContext;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.kibanaVersion = this.initializerContext.env.packageInfo.version;
  }

  public setup(core: CoreSetup) {
    this.logger.debug('rac: Setup');
    const router = core.http.createRouter();

    // Register server side APIs
    defineRoutes(router);

    this.esContext = createEsContext({
      logger: this.logger,
      // TODO: get index prefix from config.get(kibana.index)
      indexNameRoot: '',
      elasticsearchClientPromise: core
        .getStartServices()
        .then(([{ elasticsearch }]) => elasticsearch.client.asInternalUser),
      kibanaVersion: this.kibanaVersion,
    });

    return {};
  }

  public start(core: CoreStart) {
    this.logger.debug('rac: Started');
    if (!this.esContext) throw new Error('esContext not initialized');

    // launches initialization async
    // if (this.eventLogService.isIndexingEntries()) {
    this.esContext.initialize();
    // }

    // Log an error if initialization didn't succeed.
    // Note that waitTillReady() is used elsewhere as a gate to having the
    // event log initialization complete - successfully or not.  Other uses
    // of this do not bother logging when success is false, as they are in
    // paths that would cause log spamming.  So we do it once, here, just to
    // ensure an unsuccessful initialization is logged when it occurs.
    this.esContext.waitTillReady().then((success) => {
      if (!success) {
        this.logger.error(`initialization failed, events will not be indexed`);
      }
    });

    return {};
  }

  public stop() {}
}
