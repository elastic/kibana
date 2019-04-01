/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

type PluginName = string;
type LoggerInfoFunc = (tags: string | string[], data?: object | string, timestamp?: number) => void;
interface PluginSetupContext {
  config: object;
}
interface Logger {
  log: LoggerInfoFunc;
}
interface PluginInitializerContext {
  logger: Logger;
}

export class ActionService {
  private readonly log: LoggerInfoFunc;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.log = this.initializerContext.logger.log;
  }

  public setup(setupContext: PluginSetupContext, deps: Record<PluginName, unknown>) {
    this.log(['actions_service', 'info'], 'ActionService setup');

    return {
      ...setupContext,
    };
  }
}
