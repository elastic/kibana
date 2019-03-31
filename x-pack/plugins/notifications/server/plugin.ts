/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  createEmailAction,
  createSlackAction,
  LoggerAction,
  notificationService,
  ServerFacade,
} from '.';
import { notificationServiceSendRoute } from './routes/api/v1/notifications';

import { INotificationService } from './service';

interface CoreSetup {
  log: (tags: string | string[], data?: string | object | (() => any), timestamp?: number) => void;
  config: () => { get<T>(key: string): T };
  plugins: { xpack_main: { info: { license: { isNotBasic: () => boolean } } } };
}
export type NotificationPluginSetup = ReturnType<Plugin['setup']>;

export class Plugin {
  public setup(core: CoreSetup, dependencies: object) {
    const server: ServerFacade = {
      log: core.log,
      config: core.config,
      plugins: core.plugins,
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
