/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { CoreQueryParamsSchemaProperties } from '../../../../triggers_actions_ui/server';

export const ID = '.index-threshold';
export const RuleTypeActionGroupId = 'threshold met';

export const RuleTypeName = i18n.translate('xpack.stackAlerts.indexThreshold.alertTypeTitle', {
  defaultMessage: 'Index threshold',
});

export const RuleTypeActionGroupName = i18n.translate(
  'xpack.stackAlerts.indexThreshold.actionGroupThresholdMetTitle',
  {
    defaultMessage: 'Threshold met',
  }
);

export const actionVariableContextGroupLabel = i18n.translate(
  'xpack.stackAlerts.indexThreshold.actionVariableContextGroupLabel',
  {
    defaultMessage: 'The group that exceeded the threshold.',
  }
);

export const actionVariableContextDateLabel = i18n.translate(
  'xpack.stackAlerts.indexThreshold.actionVariableContextDateLabel',
  {
    defaultMessage: 'The date the alert exceeded the threshold.',
  }
);

export const actionVariableContextValueLabel = i18n.translate(
  'xpack.stackAlerts.indexThreshold.actionVariableContextValueLabel',
  {
    defaultMessage: 'The value that exceeded the threshold.',
  }
);

export const actionVariableContextMessageLabel = i18n.translate(
  'xpack.stackAlerts.indexThreshold.actionVariableContextMessageLabel',
  {
    defaultMessage: 'A pre-constructed message for the alert.',
  }
);

export const actionVariableContextTitleLabel = i18n.translate(
  'xpack.stackAlerts.indexThreshold.actionVariableContextTitleLabel',
  {
    defaultMessage: 'A pre-constructed title for the alert.',
  }
);

export const actionVariableContextThresholdLabel = i18n.translate(
  'xpack.stackAlerts.indexThreshold.actionVariableContextThresholdLabel',
  {
    defaultMessage:
      "An array of values to use as the threshold; 'between' and 'notBetween' require two values, the others require one.",
  }
);

export const actionVariableContextThresholdComparatorLabel = i18n.translate(
  'xpack.stackAlerts.indexThreshold.actionVariableContextThresholdComparatorLabel',
  {
    defaultMessage: 'A comparison function to use to determine if the threshold as been met.',
  }
);

export const actionVariableContextConditionsLabel = i18n.translate(
  'xpack.stackAlerts.indexThreshold.actionVariableContextConditionsLabel',
  {
    defaultMessage: 'A string describing the threshold comparator and threshold',
  }
);

export const alertParamsVariables = Object.keys(CoreQueryParamsSchemaProperties).map(
  (propKey: string) => {
    return {
      name: propKey,
      description: propKey,
    };
  }
);
