/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import { i18n } from '@kbn/i18n';
import { RuleTypeModel } from '@kbn/triggers-actions-ui-plugin/public';
import type { UserDefinedRuleParams } from './types';
import { validateExpression } from './validation';

export function getRuleType(): RuleTypeModel<UserDefinedRuleParams> {
  return {
    id: '.user-defined',
    description: i18n.translate('xpack.stackAlerts.userDefined.descriptionText', {
      defaultMessage: 'User defined rule.',
    }),
    validate: validateExpression,
    ruleParamsExpression: lazy(() => import('./rule_form')),
    iconClass: 'visText',
    documentationUrl: null,
    requiresAppContext: false,
  };
}
