/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { NotificationsConfigType } from './config';
import { EmailServiceProvider } from './services/connectors_email_service_provider';
import type {
  NotificationsServerSetup,
  NotificationsServerSetupDependencies,
  NotificationsServerStart,
  NotificationsServerStartDependencies,
} from './types';

export class NotificationsPlugin
  implements
    Plugin<
      NotificationsServerSetup,
      NotificationsServerStart,
      NotificationsServerSetupDependencies,
      NotificationsServerStartDependencies
    >
{
  private emailServiceProvider: EmailServiceProvider;

  constructor(initializerContext: PluginInitializerContext<NotificationsConfigType>) {
    this.emailServiceProvider = new EmailServiceProvider(
      initializerContext.config.get(),
      initializerContext.logger.get()
    );
  }

  public setup(_core: CoreSetup, plugins: NotificationsServerSetupDependencies) {
    this.emailServiceProvider.setup(plugins);
  }

  public start(_core: CoreStart, plugins: NotificationsServerStartDependencies) {
    const emailStartContract = this.emailServiceProvider.start(plugins);

    return {
      ...emailStartContract,
    };
  }

  public stop() {}
}
