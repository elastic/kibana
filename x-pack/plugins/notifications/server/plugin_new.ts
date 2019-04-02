/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { first } from 'rxjs/operators';
import {
  createEmailAction,
  createSlackAction,
  INotificationService,
  LegacyConfig,
  LegacyLogger,
  LoggerAction,
  notificationService,
  ServerFacade,
} from '.';
import { CoreSetup, Logger, PluginInitializerContext } from '../../../../src/core/server';
import { LogLevel, LogLevelId } from '../../../../src/core/server/logging/log_level';
import { NotificationConfig } from '../config';
import { DependenciesSetup } from './plugin';
import { notificationServiceSendRoute } from './routes/api/v1/notifications';

function coreToLegacyConfig(coreConfig: NotificationConfig): LegacyConfig {
  const legacyConfig = {
    xpack: {
      notifications: coreConfig,
    },
  };

  return (): { get<T>(key: string): T } => {
    return {
      get<T>(key: string): T {
        return get(legacyConfig, key);
      },
    };
  };
}

function coreToLegacyLogger(coreLogger: Logger): LegacyLogger {
  return (tags: string | string[], data?: string | object | (() => any), timestamp?: number) => {
    const allLogLevels = new Set(['trace', 'debug', 'info', 'warn', 'error', 'fatal']);

    // check tags for log level
    const logLevelTagIdx = [...tags].findIndex(t => allLogLevels.has(t));

    const getMessage = (d: string | object | (() => any) | undefined): string => {
      if (d === undefined || d instanceof Error) {
        return '';
      }
      return typeof d === 'function' ? d().toString() : d.toString();
    };

    const logMeta = { tags: [...tags] };
    if (logLevelTagIdx === -1) {
      coreLogger.info(getMessage(data), logMeta);
      return;
    }

    // separate the log level tag from the rest of the metadata
    const [logLevel]: string[] = logMeta.tags.splice(logLevelTagIdx, 1);

    const logRecord = {
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      level: LogLevel.fromId(logLevel as LogLevelId),
      context: '',
      message: getMessage(data),
      error: data instanceof Error ? data : undefined,
      meta: logMeta,
    };

    coreLogger.log(logRecord);
  };
}

export class PluginNew {
  private log: LegacyLogger;
  constructor(private readonly initializerContext: PluginInitializerContext) {
    const logger = this.initializerContext.logger.get();

    this.log = coreToLegacyLogger(logger);
  }

  public async setup(core: CoreSetup, dependencies: DependenciesSetup) {
    const config: NotificationConfig = await this.initializerContext.config
      .create(NotificationConfig)
      .pipe(first())
      .toPromise();

    const server: ServerFacade = {
      log: this.log,
      config: coreToLegacyConfig(config),
      plugins: dependencies,
    };

    notificationService.setAction(new LoggerAction({ server }));

    if (config.email.enabled) {
      notificationService.setAction(createEmailAction(server));
    }

    if (config.slack.enabled) {
      notificationService.setAction(createSlackAction(server));
    }

    const s: ServerFacade = server;
    return {
      getRoute() {
        return notificationServiceSendRoute(s, notificationService);
      },

      getService(): INotificationService {
        return notificationService;
      },
    };
  }

  public stop() {
    this.log(`Stopping TestBed`);
  }
}
