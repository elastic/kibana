/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PluginSetupContract as ActionsPluginSetupContract,
  PluginStartContract as ActionsPluginStartContract,
} from '@kbn/actions-plugin/server';
import type { IEmailService } from './services/email_service';

export interface NotificationsPluginSetupDeps {
  actions: ActionsPluginSetupContract;
}

export interface NotificationsPluginStartDeps {
  actions: ActionsPluginStartContract;
}

export interface NotificationsPluginSetup {
  email: Promise<IEmailService>;
}

export interface NotificationsPluginStart {
  email: Promise<IEmailService>;
}
