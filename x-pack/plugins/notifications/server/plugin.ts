/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  createEmailAction,
  createSlackAction,
  LegacyConfig,
  LegacyLogger,
  LoggerAction,
  notificationService,
  ServerFacade,
} from '.';
import { notificationServiceSendRoute } from './routes/api/v1/notifications';

import { INotificationService } from './service';

interface CoreSetup {
  log: LegacyLogger;
  config: LegacyConfig;
  plugins: unknown;
}

export interface DependenciesSetup {
  xpack_main: unknown;
}

export class Plugin {
  public setup(core: CoreSetup, dependencies: DependenciesSetup) {
    const server: ServerFacade = {
      log: core.log,
      config: core.config,
      plugins: dependencies,
    };

    notificationService.setAction(new LoggerAction({ server }));

    if (server.config().get('xpack.notifications.email.enabled')) {
      notificationService.setAction(createEmailAction(server));
    }

    if (server.config().get('xpack.notifications.slack.enabled')) {
      notificationService.setAction(createSlackAction(server));
    }

    return {
      getRoute() {
        return notificationServiceSendRoute(server, notificationService);
      },

      getService(): INotificationService {
        return notificationService;
      },
    };
  }
}
