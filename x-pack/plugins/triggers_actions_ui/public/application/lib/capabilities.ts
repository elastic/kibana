/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Alert, AlertType } from '../../types';

/**
 * NOTE: Applications that want to show the alerting UIs will need to add
 * check against their features here until we have a better solution. This
 * will possibly go away with https://github.com/elastic/kibana/issues/52300.
 */

type Capabilities = Record<string, any>;

export const hasShowActionsCapability = (capabilities: Capabilities) => capabilities?.actions?.show;
export const hasSaveActionsCapability = (capabilities: Capabilities) => capabilities?.actions?.save;
export const hasExecuteActionsCapability = (capabilities: Capabilities) =>
  capabilities?.actions?.execute;
export const hasDeleteActionsCapability = (capabilities: Capabilities) =>
  capabilities?.actions?.delete;

export function hasAllPrivilege(alert: Alert, alertType?: AlertType): boolean {
  return alertType?.authorizedConsumers[alert.consumer]?.all ?? false;
}
export function hasReadPrivilege(alert: Alert, alertType?: AlertType): boolean {
  return alertType?.authorizedConsumers[alert.consumer]?.read ?? false;
}
