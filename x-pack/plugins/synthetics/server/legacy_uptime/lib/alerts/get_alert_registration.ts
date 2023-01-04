/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRuleTypeAlerts } from '@kbn/alerting-plugin/server/types';
import { experimentalRuleFieldMap } from '@kbn/rule-registry-plugin/common/assets/field_maps/experimental_rule_field_map';
import { uptimeRuleFieldMap } from '../../../../common/rules/uptime_rule_field_map';

export const alertRegistration: IRuleTypeAlerts = {
  context: 'observability.uptime',
  fieldMap: { ...uptimeRuleFieldMap, ...experimentalRuleFieldMap },
};
