/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EmailService, EmailServiceSetupDeps, EmailServiceStartDeps } from './services';

export type NotificationsPluginSetupDeps = EmailServiceSetupDeps;
export type NotificationsPluginStartDeps = EmailServiceStartDeps;

export interface NotificationsPluginStart {
  email?: EmailService;
}
