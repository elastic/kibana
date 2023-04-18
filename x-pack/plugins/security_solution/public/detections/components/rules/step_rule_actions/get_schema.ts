/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import type { ActionTypeRegistryContract } from '@kbn/triggers-actions-ui-plugin/public';
import { debouncedValidateRuleActionsField } from '../../../containers/detection_engine/rules/validate_rule_actions_field';

import type { FormSchema } from '../../../../shared_imports';
import type { ActionsStepRule } from '../../../pages/detection_engine/rules/types';

export const getSchema = ({
  actionTypeRegistry,
}: {
  actionTypeRegistry: ActionTypeRegistryContract;
}): FormSchema<ActionsStepRule> => ({
  actions: {
    validations: [
      {
        // Debounced validator is necessary here to prevent error validation
        // flashing when first adding an action. Also prevents additional renders
        validator: debouncedValidateRuleActionsField(actionTypeRegistry),
      },
    ],
  },
  responseActions: {},
  enabled: {},
  kibanaSiemAppUrl: {},
  throttle: {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepRuleActions.fieldThrottleLabel',
      {
        defaultMessage: 'Actions frequency',
      }
    ),
  },
});
