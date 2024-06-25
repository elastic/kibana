/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { i18n } from '@kbn/i18n';
import { ruleTypeMappings } from '@kbn/securitysolution-rules';
import type { SanitizedRule } from '@kbn/alerting-plugin/common';
import { SERVER_APP_ID } from '../../../../../../common/constants';
import type { InternalRuleCreate, RuleParams } from '../../../rule_schema';
import { transformToActionFrequency } from '../../normalization/rule_actions';
import { convertImmutableToRuleSource } from '../../normalization/rule_converters';

const DUPLICATE_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.cloneRule.duplicateTitle',
  {
    defaultMessage: 'Duplicate',
  }
);

interface DuplicateRuleParams {
  rule: SanitizedRule<RuleParams>;
}

export const duplicateRule = async ({ rule }: DuplicateRuleParams): Promise<InternalRuleCreate> => {
  // Generate a new static ruleId
  const ruleId = uuidv4();

  // If it's a prebuilt rule, reset Related Integrations, Required Fields and Setup Guide.
  // We do this because for now we don't allow the users to edit these fields for custom rules.
  const isPrebuilt = rule.params.immutable;
  const relatedIntegrations = isPrebuilt ? [] : rule.params.relatedIntegrations;
  const requiredFields = isPrebuilt ? [] : rule.params.requiredFields;
  const actions = transformToActionFrequency(rule.actions, rule.throttle);

  // Duplicated rules are always considered custom rules
  const immutable = false;

  return {
    name: `${rule.name} [${DUPLICATE_TITLE}]`,
    tags: rule.tags,
    alertTypeId: ruleTypeMappings[rule.params.type],
    consumer: SERVER_APP_ID,
    params: {
      ...rule.params,
      immutable,
      ruleSource: convertImmutableToRuleSource(immutable),
      ruleId,
      relatedIntegrations,
      requiredFields,
      exceptionsList: [],
    },
    schedule: rule.schedule,
    enabled: false,
    actions,
  };
};
