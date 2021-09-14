/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from 'kibana/server';
import type { AlertingPlugin } from '../../../../alerting/server';
// import { registerTransformHealthRuleType } from './transform_health_rule_type';

export interface RegisterAlertParams {
  alerting: AlertingPlugin['setup'];
  logger: Logger;
}
// export function registerTransformAlertingRules(params: RegisterAlertParams) {
//   registerTransformHealthRuleType(params);
// }
