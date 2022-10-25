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
  NotificationsPluginStart,
} from './types';
import { type EmailService, checkEmailServiceConfiguration, getEmailService } from './services';
import type { NotificationsConfigType } from './config';

export class NotificationsPlugin implements Plugin<void, NotificationsPluginStart> {
  private readonly logger: Logger;
  private readonly initialConfig: NotificationsConfigType;
  private emailServiceSetupSuccessful: boolean;

  constructor(initializerContext: PluginInitializerContext<NotificationsConfigType>) {
    this.logger = initializerContext.logger.get();
    this.initialConfig = initializerContext.config.get();
    this.emailServiceSetupSuccessful = false;
  }

  public setup(_core: CoreSetup, plugins: NotificationsPluginSetupDeps) {
    try {
      checkEmailServiceConfiguration({
        config: this.initialConfig,
        plugins,
      });
      this.emailServiceSetupSuccessful = true;
    } catch (err) {
      this.logger.warn(`Email Service Setup ${err}`);
    }
  }

  public start(_core: CoreStart, plugins: NotificationsPluginStartDeps) {
    let email: EmailService | undefined;
    try {
      if (this.emailServiceSetupSuccessful) {
        email = getEmailService({
          config: this.initialConfig,
          plugins,
          logger: this.logger,
        });
      }
    } catch (err) {
      this.logger.warn(`Error starting email service: ${err}`);
    }

    return { email };
  }

  public stop() {}
}
