/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRuleTypeAlerts } from '@kbn/alerting-plugin/server/types';
import { experimentalRuleFieldMap } from '@kbn/rule-registry-plugin/common/assets/field_maps/experimental_rule_field_map';

export const logAlertRegistration: IRuleTypeAlerts = {
  context: 'observability.logs',
  fieldMap: experimentalRuleFieldMap,
};

export const metricAlertRegistration: IRuleTypeAlerts = {
  context: 'observability.metrics',
  fieldMap: experimentalRuleFieldMap,
};
