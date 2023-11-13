/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core/public';
import { createLogAIAssistant } from './components/log_ai_assistant';
import { LogViewsService } from './services/log_views';
import { LogsSharedClientPluginClass, LogsSharedClientStartDeps } from './types';

export class LogsSharedPlugin implements LogsSharedClientPluginClass {
  private logViews: LogViewsService;

  constructor() {
    this.logViews = new LogViewsService();
  }

  public setup() {
    const logViews = this.logViews.setup();

    return { logViews };
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
