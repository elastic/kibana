/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core/public';
import {
  LogsLocatorDefinition,
  NodeLogsLocatorDefinition,
  TraceLogsLocatorDefinition,
} from '../common/locators';
import { createLogAIAssistant } from './components/log_ai_assistant';
import { LogViewsService } from './services/log_views';
import {
  LogsSharedClientCoreSetup,
  LogsSharedClientPluginClass,
  LogsSharedClientSetupDeps,
  LogsSharedClientStartDeps,
} from './types';

export class LogsSharedPlugin implements LogsSharedClientPluginClass {
  private logViews: LogViewsService;

  constructor() {
    this.logViews = new LogViewsService();
  }

  public setup(_: LogsSharedClientCoreSetup, pluginsSetup: LogsSharedClientSetupDeps) {
    const logViews = this.logViews.setup();

    const logsLocator = pluginsSetup.share.url.locators.create(
      new LogsLocatorDefinition(pluginsSetup.share.url.locators)
    );
    const nodeLogsLocator = pluginsSetup.share.url.locators.create(
      new NodeLogsLocatorDefinition(pluginsSetup.share.url.locators)
    );

    const traceLogsLocator = pluginsSetup.share.url.locators.create(
      new TraceLogsLocatorDefinition(pluginsSetup.share.url.locators)
    );

    const locators = {
      logsLocator,
      nodeLogsLocator,
      traceLogsLocator,
    };

    return { logViews, locators };
  }

  public start(core: CoreStart, plugins: LogsSharedClientStartDeps) {
    const { http } = core;
    const { data, dataViews, observabilityAIAssistant } = plugins;

    const logViews = this.logViews.start({
      http,
      dataViews,
      search: data.search,
    });

    const LogAIAssistant = createLogAIAssistant({ observabilityAIAssistant });

    return {
      logViews,
      LogAIAssistant,
    };
  }

  public stop() {}
}
