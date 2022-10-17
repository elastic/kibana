/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '@kbn/core/server';
import { Defer, defer } from '@kbn/kibana-utils-plugin/common';
import type {
  NotificationsPluginSetupDeps,
  NotificationsPluginStartDeps,
  NotificationsPluginSetup,
  NotificationsPluginStart,
} from './types';
import { EmailService } from './services';
import { NotificationsConfigType } from './config';
import { PLUGIN_ID } from '../common';

export class NotificationsPlugin
  implements Plugin<NotificationsPluginSetup, NotificationsPluginStart>
{
  private readonly logger: Logger;
  private readonly initialConfig: NotificationsConfigType;
  private emailService: Defer<EmailService>;
  private emailConnector: string;

  constructor(initializerContext: PluginInitializerContext<NotificationsConfigType>) {
    this.logger = initializerContext.logger.get();
    this.emailService = defer<EmailService>();
    this.initialConfig = initializerContext.config.get();
  }

  public setup(core: CoreSetup, plugins: NotificationsPluginSetupDeps) {
    if (!plugins.actions) {
      this.emailService.reject(
        `Error starting notification services: 'actions' plugin not available.`
      );
      return { email: this.emailService.promise };
    }

    const emailConnector = this.initialConfig.connectors?.default?.email;
    if (!emailConnector) {
      this.emailService.reject(
        'Error starting notification services: Email connector not specified'
      );
      return { email: this.emailService.promise };
    }

    if (!plugins.actions.isPreconfiguredConnector(emailConnector)) {
      this.emailService.reject(
        `Error starting notification services: Unexisting email connector '${emailConnector}' specified`
      );
      return { email: this.emailService.promise };
    }

    plugins.actions.registerUnsecuredActionsClientAccess(PLUGIN_ID);

    this.emailConnector = emailConnector;

    return {
      email: this.emailService.promise,
    };
  }

  public start(core: CoreStart, plugins: NotificationsPluginStartDeps) {
    if (this.emailConnector) {
      plugins.actions.getUnsecuredActionsClient().then(
        (actionsClient) => {
          const email = new EmailService(PLUGIN_ID, this.emailConnector, actionsClient);
          this.emailService.resolve(email);
        },
        (error) => {
          this.logger.warn(`Error starting notification services: ${error}`);
          this.emailService.reject(error);
        }
      );
    }

    return {
      email: this.emailService.promise,
    };
  }

  public stop() {}
}
