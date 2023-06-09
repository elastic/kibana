/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  PluginInitializerContext,
  CoreStart,
  Plugin,
  Logger,
  PluginConfigDescriptor,
} from '@kbn/core/server';

import { schema } from '@kbn/config-schema';
import {
  LogsSharedConfig,
  LogsSharedPluginCoreSetup,
  LogsSharedPluginSetup,
  LogsSharedPluginStart,
  LogsSharedServerPluginSetupDeps,
  LogsSharedServerPluginStartDeps,
} from './types';
import { logViewSavedObjectType } from './saved_objects';
import { initLogsSharedServer } from './logs_shared_server';
import { LogViewsService } from './services/log_views';
import { KibanaFramework } from './lib/adapters/framework/kibana_framework_adapter';
import { LogsSharedBackendLibs, LogsSharedDomainLibs } from './lib/logs_shared_types';
import { LogsSharedLogEntriesDomain } from './lib/domains/log_entries_domain';
import { LogsSharedKibanaLogEntriesAdapter } from './lib/adapters/log_entries/kibana_log_entries_adapter';
import { defaultLogViewsStaticConfig } from '../common/log_views';
import { LogEntriesService } from './services/log_entries';
import { publicConfigKeys } from '../common/plugin_config_types';

export const config: PluginConfigDescriptor<LogsSharedConfig> = {
  schema: schema.object({
    sources: schema.maybe(
      schema.object({
        default: schema.maybe(
          schema.object({
            fields: schema.maybe(
              schema.object({
                message: schema.maybe(schema.arrayOf(schema.string())),
              })
            ),
          })
        ),
      })
    ),
  }),
  exposeToBrowser: publicConfigKeys,
};

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
  private libs!: LogsSharedBackendLibs;
  private logViews: LogViewsService;

  constructor(context: PluginInitializerContext<LogsSharedConfig>) {
    this.config = context.config.get();
    this.logger = context.logger.get();

    this.logViews = new LogViewsService(this.logger.get('logViews'));
  }

  public setup(core: LogsSharedPluginCoreSetup, plugins: LogsSharedServerPluginSetupDeps) {
    const framework = new KibanaFramework(core, this.config, plugins);

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
      configuration: this.config,
      framework,
      getStartServices: () => core.getStartServices(),
      logger: this.logger,
    };

    // Register server side APIs
    initLogsSharedServer(this.libs);

    const logEntriesService = new LogEntriesService();
    logEntriesService.setup(core, plugins);

    return {
      logViews,
    };
  }

  public start(core: CoreStart, plugins: LogsSharedServerPluginStartDeps) {
    const logViews = this.logViews.start({
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
