/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertsHealth } from './alert';

export * from './alert';
export * from './alert_type';
export * from './alert_instance';
export * from './alert_task_instance';
export * from './alert_navigation';
export * from './alert_instance_summary';
export * from './builtin_action_groups';
export * from './disabled_action_groups';
export * from './alert_notify_when_type';
export * from './parse_duration';

export interface AlertingFrameworkHealth {
  isSufficientlySecure: boolean;
  hasPermanentEncryptionKey: boolean;
  alertingFrameworkHeath: AlertsHealth;
}

export const BASE_ALERT_API_PATH = '/api/alerts';
export const ALERTS_FEATURE_ID = 'alerts';
