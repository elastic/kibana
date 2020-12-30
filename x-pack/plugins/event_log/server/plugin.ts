/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable } from 'rxjs';
import { first } from 'rxjs/operators';
import {
  CoreSetup,
  CoreStart,
  Logger,
  Plugin as CorePlugin,
  PluginInitializerContext,
  LegacyClusterClient,
  SharedGlobalConfig,
  IContextProvider,
  RequestHandler,
} from 'src/core/server';
import { SpacesPluginStart } from '../../spaces/server';

import {
  IEventLogConfig,
  IEventLogService,
  IEventLogger,
  IEventLogConfig$,
  IEventLogClientService,
} from './types';
import { findRoute } from './routes';
import { EventLogService } from './event_log_service';
import { createEsContext, EsContext } from './es';
import { EventLogClientService } from './event_log_start_service';
import { SavedObjectProviderRegistry } from './saved_object_provider_registry';

export type PluginClusterClient = Pick<LegacyClusterClient, 'callAsInternalUser' | 'asScoped'>;

const PROVIDER = 'eventLog';

const ACTIONS = {
  starting: 'starting',
  stopping: 'stopping',
};

interface PluginStartDeps {
  spaces?: SpacesPluginStart;
}

export class Plugin implements CorePlugin<IEventLogService, IEventLogClientService> {
  private readonly config$: IEventLogConfig$;
  private systemLogger: Logger;
  private eventLogService?: EventLogService;
  private esContext?: EsContext;
  private eventLogger?: IEventLogger;
  private globalConfig$: Observable<SharedGlobalConfig>;
  private eventLogClientService?: EventLogClientService;
  private savedObjectProviderRegistry: SavedObjectProviderRegistry;

  constructor(private readonly context: PluginInitializerContext) {
    this.systemLogger = this.context.logger.get();
    this.config$ = this.context.config.create<IEventLogConfig>();
    this.globalConfig$ = this.context.config.legacy.globalConfig$;
    this.savedObjectProviderRegistry = new SavedObjectProviderRegistry();
  }

  async setup(core: CoreSetup): Promise<IEventLogService> {
    const globalConfig = await this.globalConfig$.pipe(first()).toPromise();
    const kibanaIndex = globalConfig.kibana.index;

    this.systemLogger.debug('setting up plugin');

    const config = await this.config$.pipe(first()).toPromise();

    this.esContext = createEsContext({
      logger: this.systemLogger,
      // TODO: get index prefix from config.get(kibana.index)
      indexNameRoot: kibanaIndex,
      clusterClientPromise: core
        .getStartServices()
        .then(([{ elasticsearch }]) => elasticsearch.legacy.client),
    });

    this.eventLogService = new EventLogService({
      config,
      esContext: this.esContext,
      systemLogger: this.systemLogger,
      kibanaUUID: this.context.env.instanceUuid,
      savedObjectProviderRegistry: this.savedObjectProviderRegistry,
    });

    this.eventLogService.registerProviderActions(PROVIDER, Object.values(ACTIONS));

    this.eventLogger = this.eventLogService.getLogger({
      event: { provider: PROVIDER },
    });

    core.http.registerRouteHandlerContext('eventLog', this.createRouteHandlerContext());

    // Routes
    const router = core.http.createRouter();
    // Register routes
    findRoute(router, this.systemLogger);

    return this.eventLogService;
  }

  async start(core: CoreStart, { spaces }: PluginStartDeps): Promise<IEventLogClientService> {
    this.systemLogger.debug('starting plugin');

    if (!this.esContext) throw new Error('esContext not initialized');
    if (!this.eventLogger) throw new Error('eventLogger not initialized');
    if (!this.eventLogService) throw new Error('eventLogService not initialized');

    // launches initialization async
    if (this.eventLogService.isIndexingEntries()) {
      this.esContext.initialize();
    }

    // Log an error if initialiization didn't succeed.
    // Note that waitTillReady() is used elsewhere as a gate to having the
    // event log initialization complete - successfully or not.  Other uses
    // of this do not bother logging when success is false, as they are in
    // paths that would cause log spamming.  So we do it once, here, just to
    // ensure an unsucccess initialization is logged when it occurs.
    this.esContext.waitTillReady().then((success) => {
      if (!success) {
        this.systemLogger.error(`initialization failed, events will not be indexed`);
      }
    });

    // will log the event after initialization
    this.eventLogger.logEvent({
      event: { action: ACTIONS.starting },
      message: 'eventLog starting',
    });

    this.savedObjectProviderRegistry.registerDefaultProvider((request) => {
      const client = core.savedObjects.getScopedClient(request);
      return client.get.bind(client);
    });

    this.eventLogClientService = new EventLogClientService({
      esContext: this.esContext,
      savedObjectProviderRegistry: this.savedObjectProviderRegistry,
      spacesService: spaces?.spacesService,
    });
    return this.eventLogClientService;
  }

  async stop(): Promise<void> {
    this.systemLogger.debug('stopping plugin');

    if (!this.eventLogger) throw new Error('eventLogger not initialized');

    // note that it's unlikely this event would ever be written,
    // when Kibana is actuaelly stopping, as it's written asynchronously
    this.eventLogger.logEvent({
      event: { action: ACTIONS.stopping },
      message: 'eventLog stopping',
    });

    this.systemLogger.debug('shutdown: waiting to finish');
    await this.esContext?.shutdown();
    this.systemLogger.debug('shutdown: finished');
  }

  private createRouteHandlerContext = (): IContextProvider<
    RequestHandler<unknown, unknown, unknown>,
    'eventLog'
  > => {
    return async (context, request) => {
      return {
        getEventLogClient: () => this.eventLogClientService!.getClient(request),
      };
    };
  };
}
