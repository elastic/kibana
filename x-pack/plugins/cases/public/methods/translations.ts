/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const CASE_SUCCESS_TOAST = (title: string) =>
  i18n.translate('xpack.cases.actions.caseSuccessToast', {
    values: { title },
    defaultMessage: 'An alert has been added to "{title}"',
  });

export const CASE_SUCCESS_SYNC_TEXT = i18n.translate('xpack.cases.actions.caseSuccessSyncText', {
  defaultMessage: 'Alerts in this case have their status synched with the case status',
});

export const VIEW_CASE = i18n.translate('xpack.cases.actions.viewCase', {
  defaultMessage: 'View Case',
});
