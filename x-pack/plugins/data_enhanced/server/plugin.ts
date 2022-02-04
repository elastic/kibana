/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { CoreSetup, CoreStart, Logger, Plugin, PluginInitializerContext } from 'kibana/server';
import { registerSessionRoutes } from './routes';
import { searchSessionSavedObjectType } from './saved_objects';
import type {
  DataEnhancedRequestHandlerContext,
  DataEnhancedSetupDependencies as SetupDependencies,
  DataEnhancedStartDependencies as StartDependencies,
} from './type';
import { ConfigSchema } from '../config';
import { registerUsageCollector } from './collectors';
import { SearchSessionService } from './search';

export class EnhancedDataServerPlugin
  implements Plugin<void, void, SetupDependencies, StartDependencies>
{
  private readonly logger: Logger;
  private sessionService!: SearchSessionService;
  private config: ConfigSchema;

  constructor(private initializerContext: PluginInitializerContext<ConfigSchema>) {
    this.logger = initializerContext.logger.get('data_enhanced');
    this.config = this.initializerContext.config.get<ConfigSchema>();
  }

  public setup(core: CoreSetup<StartDependencies>, deps: SetupDependencies) {
    core.savedObjects.registerType(searchSessionSavedObjectType);
    const eventLog = deps.eventLog;
    eventLog.registerProviderActions('data', ['session-complete']);

    const logger = eventLog.getLogger({ event: { provider: 'data' } });

    core.http.createRouter().post(
      {
        path: '/internal/log-session-complete',
        validate: {
          body: schema.object({
            sessionId: schema.string(),
            bfetch: schema.boolean(),
            appId: schema.string(),
            searchCount: schema.number(),
            took: schema.number(),
          }),
        },
      },
      (ctx, req, res) => {
        const body = req.body as any;

        const eventBody = {
          data: {
            took: body.took,
            searchCount: body.searchCount,
            appId: body.appId,
            bfetch: body.bfetch,
            sessionId: body.sessionId,
          },
        };
        logger.logEvent({
          message: 'session complete',
          kibana: eventBody,
          event: {
            provider: 'data',
            kind: 'event',
            action: 'session-complete',
          },
          log: {
            level: 'info',
            logger: 'data',
          },
        });

        return res.ok();
      }
    );

    this.sessionService = new SearchSessionService(
      this.logger,
      this.config,
      this.initializerContext.env.packageInfo.version,
      deps.security
    );

    deps.data.__enhance({
      search: {
        sessionService: this.sessionService,
      },
    });

    const router = core.http.createRouter<DataEnhancedRequestHandlerContext>();
    registerSessionRoutes(router, this.logger);

    this.sessionService.setup(core, {
      taskManager: deps.taskManager,
    });

    if (deps.usageCollection) {
      registerUsageCollector(deps.usageCollection, core.savedObjects.getKibanaIndex(), this.logger);
    }
  }

  public start(core: CoreStart, { taskManager }: StartDependencies) {
    this.sessionService.start(core, {
      taskManager,
    });
  }

  public stop() {
    this.sessionService.stop();
  }
}

export { EnhancedDataServerPlugin as Plugin };
