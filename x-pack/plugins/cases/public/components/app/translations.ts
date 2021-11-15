/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const NO_PRIVILEGES_MSG = (pageName: string) =>
  i18n.translate('xpack.cases.noPrivileges.message', {
    values: { pageName },
    defaultMessage:
      'To view {pageName} page, you must update privileges. For more information, contact your Kibana administrator.',
  });

export const NO_PRIVILEGES_TITLE = i18n.translate('xpack.cases.noPrivileges.title', {
  defaultMessage: 'Privileges required',
});

export const NO_PRIVILEGES_BUTTON = i18n.translate('xpack.cases.noPrivileges.button', {
  defaultMessage: 'Back to Cases',
});

export const CREATE_CASE_PAGE_NAME = i18n.translate('xpack.cases.createCase', {
  defaultMessage: 'Create Case',
});

export const CONFIGURE_CASES_PAGE_NAME = i18n.translate('xpack.cases.configureCases', {
  defaultMessage: 'Configure Cases',
});

export const READ_ONLY_BADGE_TEXT = i18n.translate('xpack.cases.badge.readOnly.text', {
  defaultMessage: 'Read only',
});

export const READ_ONLY_BADGE_TOOLTIP = i18n.translate('xpack.cases.badge.readOnly.tooltip', {
  defaultMessage: 'Unable to create or edit cases',
});
