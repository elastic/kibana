/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext, CoreStart, Plugin, Logger } from '@kbn/core/server';
import type { NotificationsPluginStartDeps, NotificationsPluginStart } from './types';
import { type EmailService, getEmailService } from './services';
import type { NotificationsConfigType } from './config';

export class NotificationsPlugin implements Plugin<void, NotificationsPluginStart> {
  private readonly logger: Logger;
  private readonly initialConfig: NotificationsConfigType;

  constructor(initializerContext: PluginInitializerContext<NotificationsConfigType>) {
    this.logger = initializerContext.logger.get();
    this.initialConfig = initializerContext.config.get();
  }

  public setup() {}

  public start(core: CoreStart, plugins: NotificationsPluginStartDeps) {
    let email: EmailService | undefined;
    try {
      email = getEmailService({ config: this.initialConfig, plugins });
    } catch (err) {
      this.logger.warn(`Error creating email service: ${err}`);
    }

    return { email };
  }

  public stop() {}
}
