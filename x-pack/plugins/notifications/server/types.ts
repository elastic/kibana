/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EmailServiceStart, EmailServiceSetupDeps, EmailServiceStartDeps } from './services';

// The 'notifications' plugin is currently only exposing an email service.
// If we want to expose other services in the future, we should update these types accordingly
export type NotificationsPluginSetupDeps = EmailServiceSetupDeps;
export type NotificationsPluginStartDeps = EmailServiceStartDeps;
export type NotificationsPluginStart = EmailServiceStart;
