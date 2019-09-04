/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { first } from 'rxjs/operators';
import {
  CoreSetup,
  CoreStart,
  Logger,
  Plugin as CorePlugin,
  PluginInitializerContext,
  ClusterClient,
} from 'src/core/server';

import { IEventLogConfig, IEventLogService, IEventLogger, IEventLogConfig$ } from './types';
import { EventLogService } from './event_log_service';
import { createEsContext, EsContext } from './es';

export type PluginClusterClient = Pick<ClusterClient, 'callAsInternalUser' | 'asScoped'>;

// TODO - figure out how to get ${kibana.index} for `.kibana`
const KIBANA_INDEX = '.kibana';

const PROVIDER = 'event_log';
const ACTIONS = {
  starting: 'starting',
  stopping: 'stopping',
};

export class Plugin implements CorePlugin<IEventLogService> {
  private readonly config$: IEventLogConfig$;
  private systemLogger: Logger;
  private eventLogService?: IEventLogService;
  private esContext?: EsContext;
  private eventLogger?: IEventLogger;

  constructor(private readonly context: PluginInitializerContext) {
    this.systemLogger = this.context.logger.get();
    this.config$ = this.context.config.create<IEventLogConfig>();
  }

  async setup(core: CoreSetup): Promise<IEventLogService> {
    this.systemLogger.debug('setting up plugin');

    const config = await this.config$.pipe(first()).toPromise();

    this.esContext = createEsContext({
      logger: this.systemLogger,
      // TODO: get index prefix from config.get(kibana.index)
      indexNameRoot: KIBANA_INDEX,
      clusterClient$: core.elasticsearch.adminClient$,
    });

    this.eventLogService = new EventLogService({
      config,
      esContext: this.esContext,
      systemLogger: this.systemLogger,
    });

    this.eventLogService.registerProviderActions(PROVIDER, Object.values(ACTIONS));

    this.eventLogger = this.eventLogService.getLogger({
      event: { provider: PROVIDER },
    });

    return this.eventLogService;
  }

  async start(core: CoreStart) {
    this.systemLogger.debug('starting plugin');

    // launches initialization async
    if (this.eventLogService!.isIndexingEntries()) {
      this.esContext!.initialize();
    }

    // will log the event after initialization
    this.eventLogger!.logEvent({
      event: { action: ACTIONS.starting },
      message: 'event_log starting',
    });
  }

  stop() {
    this.systemLogger.debug('stopping plugin');

    // note that it's unlikely this event would ever be written,
    // when Kibana is actuaelly stopping, as it's written asynchronously
    this.eventLogger!.logEvent({
      event: { action: ACTIONS.stopping },
      message: 'event_log stopping',
    });
  }
}
