/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext, CoreSetup, CoreStart, Plugin, Logger } from '@kbn/core/server';

import {
  LogsSharedConfig,
  LogsSharedPluginSetup,
  LogsSharedPluginStart,
  LogsSharedServerPluginSetupDeps,
  LogsSharedServerPluginStartDeps,
} from './types';
import { logViewSavedObjectType } from './saved_objects';
import { initLogsSharedServer } from './logs_shared_server';

export class LogsSharedPlugin
  implements
    Plugin<
      LogsSharedPluginSetup,
      LogsSharedPluginStart,
      LogsSharedServerPluginSetupDeps,
      LogsSharedServerPluginStartDeps
    >
{
  private readonly config: LogsSharedConfig;
  private readonly logger: Logger;
  private logViews: LogViewsService;

  constructor(context: PluginInitializerContext<LogsSharedConfig>) {
    this.config = context.config.get();
    this.logger = context.logger.get();

    this.logViews = new LogViewsService(this.logger.get('logViews'));
  }

  public setup(core: CoreSetup, plugins: LogsSharedServerPluginSetupDeps) {
    // TODO: init framework

    const logViews = this.logViews.setup();

    // Register saved objects
    core.savedObjects.registerType(logViewSavedObjectType);

    // Register server side APIs
    initLogsSharedServer(this.libs);

    return {
      logViews,
    };
  }

  public start(core: CoreStart, plugins: LogsSharedServerPluginStartDeps) {
    const logViews = this.logViews.start({
      infraSources: this.libs.sources,
      savedObjects: core.savedObjects,
      dataViews: plugins.dataViews,
      elasticsearch: core.elasticsearch,
      config: {
        messageFields:
          this.config.sources?.default?.fields?.message ??
          defaultLogViewsStaticConfig.messageFields,
      },
    });

    return { logViews };
  }

  public stop() {}
}
