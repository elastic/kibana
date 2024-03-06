/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const REFRESH_CERT = i18n.translate('xpack.uptime.certificates.refresh', {
  defaultMessage: 'Refresh',
});

export const settings = {
  breadcrumbText: i18n.translate('xpack.uptime.settingsBreadcrumbText', {
    defaultMessage: 'Settings',
  }),
  editNoticeTitle: i18n.translate('xpack.uptime.settings.cannotEditTitle', {
    defaultMessage: 'You do not have permission to edit settings.',
  }),
  editNoticeText: i18n.translate('xpack.uptime.settings.cannotEditText', {
    defaultMessage:
      "Your user currently has 'Read' permissions for the Uptime app. Enable a permissions-level of 'All' to edit these settings.",
  }),
  mustBeNumber: i18n.translate('xpack.uptime.settings.blankNumberField.error', {
    defaultMessage: 'Must be a number.',
  }),
};

export const BLANK_STR = i18n.translate('xpack.uptime.settings.blank.error', {
  defaultMessage: 'May not be blank.',
});

export const SPACE_STR = i18n.translate('xpack.uptime.settings.noSpace.error', {
  defaultMessage: 'Index names must not contain space',
});
