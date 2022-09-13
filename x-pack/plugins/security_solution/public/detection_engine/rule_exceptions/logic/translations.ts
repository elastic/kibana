/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ADD_EXCEPTION_ERROR = i18n.translate(
  'xpack.securitySolution.exceptions.createExceptionItem.error',
  {
    defaultMessage: 'Failed to add exception',
  }
);

export const ADD_RULE_EXCEPTION_ERROR_TITLE = (ruleName: string) =>
  i18n.translate('xpack.securitySolution.exceptions.addRuleExceptionToastSuccessText', {
    values: { ruleName },
    defaultMessage: 'Error adding exception to rule - {ruleName}.',
  });

export const CLOSE_ALERTS_SUCCESS = (numAlerts: number) =>
  i18n.translate('xpack.securitySolution.exceptions.closeAlerts.success', {
    values: { numAlerts },
    defaultMessage:
      'Successfully updated {numAlerts} {numAlerts, plural, =1 {alert} other {alerts}}',
  });

export const CLOSE_ALERTS_ERROR = i18n.translate(
  'xpack.securitySolution.exceptions.closeAlerts.error',
  {
    defaultMessage: 'Failed to close alerts',
  }
);
