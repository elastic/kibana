/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';

import { i18n } from '@kbn/i18n';
import { ruleTypeMappings, SIGNALS_ID } from '@kbn/securitysolution-rules';

import { SanitizedRule } from '@kbn/alerting-plugin/common';
import { SERVER_APP_ID } from '../../../../common/constants';
import { InternalRuleCreate, RuleParams } from '../schemas/rule_schemas';
import { addTags } from './add_tags';

const DUPLICATE_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.cloneRule.duplicateTitle',
  {
    defaultMessage: 'Duplicate',
  }
);

export const duplicateRule = (
  rule: SanitizedRule<RuleParams>,
  isRuleRegistryEnabled: boolean
): InternalRuleCreate => {
  const newRuleId = uuid.v4();
  return {
    name: `${rule.name} [${DUPLICATE_TITLE}]`,
    tags: addTags(rule.tags, newRuleId, false),
    alertTypeId: isRuleRegistryEnabled ? ruleTypeMappings[rule.params.type] : SIGNALS_ID,
    consumer: SERVER_APP_ID,
    params: {
      ...rule.params,
      immutable: false,
      ruleId: newRuleId,
    },
    schedule: rule.schedule,
    enabled: false,
    actions: rule.actions,
    throttle: null,
    notifyWhen: null,
  };
};
