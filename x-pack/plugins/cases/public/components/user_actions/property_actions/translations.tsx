/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
export * from '../translations';

export const DELETE_ATTACHMENT = i18n.translate('xpack.cases.userActions.deleteAttachment', {
  defaultMessage: 'Delete attachment',
});

export const REMOVE_ALERTS = (totalAlerts: number): string =>
  i18n.translate('xpack.cases.caseView.alerts.removeAlerts', {
    values: { totalAlerts },
    defaultMessage: 'Remove {totalAlerts, plural, =1 {alert} other {alerts}}',
  });

export const REMOVE = i18n.translate('xpack.cases.caseView.alerts.remove', {
  defaultMessage: 'Remove',
});
