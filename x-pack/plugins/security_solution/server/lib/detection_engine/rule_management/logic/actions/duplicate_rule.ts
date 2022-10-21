/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import { i18n } from '@kbn/i18n';
import { ruleTypeMappings } from '@kbn/securitysolution-rules';
import type { SanitizedRule } from '@kbn/alerting-plugin/common';

import { SERVER_APP_ID } from '../../../../../../common/constants';
import type { InternalRuleCreate, RuleParams } from '../../../rule_schema';

const DUPLICATE_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.cloneRule.duplicateTitle',
  {
    defaultMessage: 'Duplicate',
  }
);

export const duplicateRule = (rule: SanitizedRule<RuleParams>): InternalRuleCreate => {
  // Generate a new static ruleId
  const ruleId = uuid.v4();

  // If it's a prebuilt rule, reset Related Integrations, Required Fields and Setup Guide.
  // We do this because for now we don't allow the users to edit these fields for custom rules.
  const isPrebuilt = rule.params.immutable;
  const relatedIntegrations = isPrebuilt ? [] : rule.params.relatedIntegrations;
  const requiredFields = isPrebuilt ? [] : rule.params.requiredFields;
  const setup = isPrebuilt ? '' : rule.params.setup;

  return {
    name: `${rule.name} [${DUPLICATE_TITLE}]`,
    tags: rule.tags,
    alertTypeId: ruleTypeMappings[rule.params.type],
    consumer: SERVER_APP_ID,
    params: {
      ...rule.params,
      immutable: false,
      ruleId,
      relatedIntegrations,
      requiredFields,
      setup,
    },
    schedule: rule.schedule,
    enabled: false,
    actions: rule.actions,
    throttle: null,
    notifyWhen: null,
  };
};
