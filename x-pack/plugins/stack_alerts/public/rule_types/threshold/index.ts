/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import { i18n } from '@kbn/i18n';
import { RuleTypeModel } from '@kbn/triggers-actions-ui-plugin/public';
import { validateExpression } from './validation';
import { IndexThresholdRuleParams } from './types';

export function getRuleType(): RuleTypeModel<IndexThresholdRuleParams> {
  return {
    id: '.index-threshold',
    description: i18n.translate('xpack.stackAlerts.threshold.ui.alertType.descriptionText', {
      defaultMessage: 'Alert when an aggregated query meets the threshold.',
    }),
    iconClass: 'alert',
    documentationUrl: (docLinks) => docLinks.links.alerting.indexThreshold,
    ruleParamsExpression: lazy(() => import('./expression')),
    validate: validateExpression,
    defaultActionMessage: i18n.translate(
      'xpack.stackAlerts.threshold.ui.alertType.defaultActionMessage',
      {
        defaultMessage: `Rule '{{rule.name}}' is active for group '{{context.group}}':

- Value: '{{context.value}}'
- Conditions Met: '{{context.conditions}}' over '{{rule.params.timeWindowSize}}''{{rule.params.timeWindowUnit}}'
- Timestamp: '{{context.date}}'`,
      }
    ),
    requiresAppContext: false,
  };
}
