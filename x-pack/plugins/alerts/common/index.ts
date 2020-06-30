/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export * from './alert';
export * from './alert_type';
export * from './alert_instance';
export * from './alert_task_instance';
export * from './alert_navigation';

export interface ActionGroup {
  id: string;
  name: string;
}

export interface AlertingFrameworkHealth {
  isSufficientlySecure: boolean;
  hasPermanentEncryptionKey: boolean;
}

export const BASE_ALERT_API_PATH = '/api/alerts';
