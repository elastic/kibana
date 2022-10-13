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
import type {
  NotificationsPluginSetupDeps,
  NotificationsPluginStartDeps,
  NotificationsPluginSetup,
  NotificationsPluginStart,
} from './types';
import { EmailService } from './services';
import { NotificationsConfigType } from './config';
import { getResolvablePromise, type ResolvablePromise } from '../common/lib';
import { PLUGIN_ID } from '../common';

export class NotificationsPlugin
  implements Plugin<NotificationsPluginSetup, NotificationsPluginStart>
{
  private readonly logger: Logger;
  private readonly initialConfig: NotificationsConfigType;
  private email: ResolvablePromise<EmailService>;
  private emailConnector: string;

  constructor(initializerContext: PluginInitializerContext<NotificationsConfigType>) {
    this.logger = initializerContext.logger.get();
    this.email = getResolvablePromise();
    this.initialConfig = initializerContext.config.get();
  }

  public setup(core: CoreSetup, plugins: NotificationsPluginSetupDeps) {
    // TODO this must be defaulted to 'elastic-cloud-email' for cloud
    if (!plugins.actions) {
      this.email.doReject(`Error starting notification services: 'actions' plugin not available.`);
      return { email: this.email };
    }

    const emailConnector = this.initialConfig.connectors?.default?.email;
    if (!emailConnector) {
      this.email.doReject('Error starting notification services: Email connector not specified');
      return { email: this.email };
    }

    if (!plugins.actions.isPreconfiguredConnector(emailConnector)) {
      this.email.doReject(
        `Error starting notification services: Unexisting email connector '${emailConnector}' specified`
      );
      return { email: this.email };
    }

    plugins.actions.registerUnsecuredActionsClientAccess(PLUGIN_ID);

    this.emailConnector = emailConnector;

    return {
      email: this.email,
    };
  }

  public start(core: CoreStart, plugins: NotificationsPluginStartDeps) {
    if (this.emailConnector) {
      plugins.actions.getUnsecuredActionsClient().then(
        (actionsClient) => {
          const email = new EmailService(PLUGIN_ID, this.emailConnector, actionsClient);
          this.email.doResolve(email);
        },
        (error) => {
          this.logger.warn(`Error starting notification services: ${error}`);
          this.email.doReject(error);
        }
      );
    }

    return {
      email: this.email,
    };
  }

  public stop() {}
}
