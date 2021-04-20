/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertType } from '../../types';
import { InitialAlert } from '../sections/alert_form/alert_reducer';

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

export function hasAllPrivilege(alert: InitialAlert, alertType?: AlertType): boolean {
  return alertType?.authorizedConsumers[alert.consumer]?.all ?? false;
}
export function hasReadPrivilege(alert: InitialAlert, alertType?: AlertType): boolean {
  return alertType?.authorizedConsumers[alert.consumer]?.read ?? false;
}
