/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext, CoreStart, Plugin, Logger } from '@kbn/core/server';

import {
  LogsSharedPluginCoreSetup,
  LogsSharedPluginSetup,
  LogsSharedPluginStart,
  LogsSharedServerPluginSetupDeps,
  LogsSharedServerPluginStartDeps,
  UsageCollector,
} from './types';
import { logViewSavedObjectType } from './saved_objects';
import { initLogsSharedServer } from './logs_shared_server';
import { LogViewsService } from './services/log_views';
import { KibanaFramework } from './lib/adapters/framework/kibana_framework_adapter';
import { LogsSharedBackendLibs, LogsSharedDomainLibs } from './lib/logs_shared_types';
import { LogsSharedLogEntriesDomain } from './lib/domains/log_entries_domain';
import { LogsSharedKibanaLogEntriesAdapter } from './lib/adapters/log_entries/kibana_log_entries_adapter';
import { LogEntriesService } from './services/log_entries';

export class LogsSharedPlugin
  implements
    Plugin<
      LogsSharedPluginSetup,
      LogsSharedPluginStart,
      LogsSharedServerPluginSetupDeps,
      LogsSharedServerPluginStartDeps
    >
{
  private readonly logger: Logger;
  private libs!: LogsSharedBackendLibs;
  private logViews: LogViewsService;
  private usageCollector: UsageCollector;

  constructor(context: PluginInitializerContext) {
    this.logger = context.logger.get();
    this.usageCollector = {};

    this.logViews = new LogViewsService(this.logger.get('logViews'));
  }

  public setup(core: LogsSharedPluginCoreSetup, plugins: LogsSharedServerPluginSetupDeps) {
    const framework = new KibanaFramework(core, plugins);

    const logViews = this.logViews.setup();

    // Register saved objects
    core.savedObjects.registerType(logViewSavedObjectType);

    const domainLibs: LogsSharedDomainLibs = {
      logEntries: new LogsSharedLogEntriesDomain(new LogsSharedKibanaLogEntriesAdapter(framework), {
        framework,
        getStartServices: () => core.getStartServices(),
      }),
    };

    this.libs = {
      ...domainLibs,
      basePath: core.http.basePath,
      framework,
      getStartServices: () => core.getStartServices(),
      logger: this.logger,
      getUsageCollector: () => this.usageCollector,
    };

    // Register server side APIs
    initLogsSharedServer(this.libs);

    const logEntriesService = new LogEntriesService();
    logEntriesService.setup(core, plugins);

    return {
      ...domainLibs,
      logViews,
      registerUsageCollectorActions: (usageCollector: UsageCollector) => {
        Object.assign(this.usageCollector, usageCollector);
      },
    };
  }

  public start(core: CoreStart, plugins: LogsSharedServerPluginStartDeps) {
    const logViews = this.logViews.start({
      savedObjects: core.savedObjects,
      dataViews: plugins.dataViews,
      elasticsearch: core.elasticsearch,
    });

    return { logViews };
  }

  public stop() {}
}
