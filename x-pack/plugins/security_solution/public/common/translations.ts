/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SOLUTION_NAME = i18n.translate('xpack.securitySolution.pages.common.solutionName', {
  defaultMessage: 'Security',
});

export const BETA = i18n.translate('xpack.securitySolution.pages.common.beta', {
  defaultMessage: 'Beta',
});

export const UPDATE_ALERT_STATUS_FAILED = (conflicts: number) =>
  i18n.translate('xpack.securitySolution.pages.common.updateAlertStatusFailed', {
    values: { conflicts },
    defaultMessage:
      'Failed to update { conflicts } {conflicts, plural, =1 {alert} other {alerts}}.',
  });

export const UPDATE_ALERT_STATUS_FAILED_DETAILED = (updated: number, conflicts: number) =>
  i18n.translate('xpack.securitySolution.pages.common.updateAlertStatusFailedDetailed', {
    values: { updated, conflicts },
    defaultMessage: `{ updated } {updated, plural, =1 {alert was} other {alerts were}} updated successfully, but { conflicts } failed to update
         because { conflicts, plural, =1 {it was} other {they were}} already being modified.`,
  });
