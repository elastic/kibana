/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApmRuleType } from '@kbn/rule-data-utils';
import { RULE_TYPES_CONFIG } from '../../../../common/rules/apm_rule_types';

export function getInitialAlertValues(
  ruleType: ApmRuleType | null,
  serviceName: string | undefined
) {
  const ruleTypeName = ruleType ? RULE_TYPES_CONFIG[ruleType].name : undefined;
  const alertName = ruleTypeName
    ? serviceName
      ? `${ruleTypeName} | ${serviceName}`
      : ruleTypeName
    : undefined;
  const tags = ['apm'];
  if (serviceName) {
    tags.push(`service.name:${serviceName}`.toLowerCase());
  }

  return {
    tags,
    ...(alertName ? { name: alertName } : {}),
  };
}
