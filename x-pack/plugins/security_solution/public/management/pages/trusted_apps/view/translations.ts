/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import {
  TrustedApp,
  MacosLinuxConditionEntry,
  WindowsConditionEntry,
} from '../../../../../common/endpoint/types';

export const ABOUT_TRUSTED_APPS = i18n.translate('xpack.securitySolution.trustedapps.aboutInfo', {
  defaultMessage:
    'Add a trusted application to improve performance or alleviate conflicts with other applications running on your hosts. Trusted applications will be applied to hosts running Endpoint Security.',
});

export const OS_TITLES: Readonly<{ [K in TrustedApp['os']]: string }> = {
  windows: i18n.translate('xpack.securitySolution.trustedapps.os.windows', {
    defaultMessage: 'Windows',
  }),
  macos: i18n.translate('xpack.securitySolution.trustedapps.os.macos', {
    defaultMessage: 'Mac OS',
  }),
  linux: i18n.translate('xpack.securitySolution.trustedapps.os.linux', {
    defaultMessage: 'Linux',
  }),
};

export const PROPERTY_TITLES: Readonly<
  { [K in keyof Omit<TrustedApp, 'id' | 'entries'>]: string }
> = {
  name: i18n.translate('xpack.securitySolution.trustedapps.trustedapp.name', {
    defaultMessage: 'Name',
  }),
  os: i18n.translate('xpack.securitySolution.trustedapps.trustedapp.os', {
    defaultMessage: 'OS',
  }),
  created_at: i18n.translate('xpack.securitySolution.trustedapps.trustedapp.createdAt', {
    defaultMessage: 'Date Created',
  }),
  created_by: i18n.translate('xpack.securitySolution.trustedapps.trustedapp.createdBy', {
    defaultMessage: 'Created By',
  }),
  description: i18n.translate('xpack.securitySolution.trustedapps.trustedapp.description', {
    defaultMessage: 'Description',
  }),
};

export const ENTRY_PROPERTY_TITLES: Readonly<
  { [K in keyof Omit<MacosLinuxConditionEntry | WindowsConditionEntry, 'type'>]: string }
> = {
  field: i18n.translate('xpack.securitySolution.trustedapps.trustedapp.entry.field', {
    defaultMessage: 'Field',
  }),
  operator: i18n.translate('xpack.securitySolution.trustedapps.trustedapp.entry.operator', {
    defaultMessage: 'Operator',
  }),
  value: i18n.translate('xpack.securitySolution.trustedapps.trustedapp.entry.value', {
    defaultMessage: 'Value',
  }),
};

export const ACTIONS_COLUMN_TITLE = i18n.translate(
  'xpack.securitySolution.trustedapps.list.columns.actions',
  {
    defaultMessage: 'Actions',
  }
);

export const LIST_ACTIONS = {
  delete: {
    name: i18n.translate('xpack.securitySolution.trustedapps.list.actions.delete', {
      defaultMessage: 'Remove',
    }),
    description: i18n.translate(
      'xpack.securitySolution.trustedapps.list.actions.delete.description',
      {
        defaultMessage: 'Remove this entry',
      }
    ),
  },
};
