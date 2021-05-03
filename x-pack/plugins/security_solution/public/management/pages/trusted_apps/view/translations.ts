/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  TrustedApp,
  MacosLinuxConditionEntry,
  WindowsConditionEntry,
  ConditionEntryField,
  OperatorFieldIds,
} from '../../../../../common/endpoint/types';

export { OS_TITLES } from '../../../common/translations';

export const ABOUT_TRUSTED_APPS = i18n.translate('xpack.securitySolution.trustedapps.aboutInfo', {
  defaultMessage:
    'Add a trusted application to improve performance or alleviate conflicts with other applications ' +
    'running on your hosts. Trusted applications will be applied to hosts running Endpoint Security.',
});

export const CONDITION_FIELD_TITLE: { [K in ConditionEntryField]: string } = {
  [ConditionEntryField.HASH]: i18n.translate(
    'xpack.securitySolution.trustedapps.logicalConditionBuilder.entry.field.hash',
    { defaultMessage: 'Hash' }
  ),
  [ConditionEntryField.PATH]: i18n.translate(
    'xpack.securitySolution.trustedapps.logicalConditionBuilder.entry.field.path',
    { defaultMessage: 'Path' }
  ),
  [ConditionEntryField.SIGNER]: i18n.translate(
    'xpack.securitySolution.trustedapps.logicalConditionBuilder.entry.field.signature',
    { defaultMessage: 'Signature' }
  ),
};

export const CONDITION_FIELD_DESCRIPTION: { [K in ConditionEntryField]: string } = {
  [ConditionEntryField.HASH]: i18n.translate(
    'xpack.securitySolution.trustedapps.logicalConditionBuilder.entry.field.description.hash',
    { defaultMessage: 'md5, sha1, or sha256' }
  ),
  [ConditionEntryField.PATH]: i18n.translate(
    'xpack.securitySolution.trustedapps.logicalConditionBuilder.entry.field.description.path',
    { defaultMessage: 'The full path of the application' }
  ),
  [ConditionEntryField.SIGNER]: i18n.translate(
    'xpack.securitySolution.trustedapps.logicalConditionBuilder.entry.field.description.signature',
    { defaultMessage: 'The signer of the application' }
  ),
};

export const OPERATOR_TITLES: { [K in OperatorFieldIds]: string } = {
  is: i18n.translate('xpack.securitySolution.trustedapps.card.operator.is', {
    defaultMessage: 'is',
  }),
  matches: i18n.translate('xpack.securitySolution.trustedapps.card.operator.matches', {
    defaultMessage: 'matches',
  }),
};

export const PROPERTY_TITLES: Readonly<
  { [K in keyof Omit<TrustedApp, 'id' | 'entries' | 'version'>]: string }
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
  updated_at: i18n.translate('xpack.securitySolution.trustedapps.trustedapp.updatedAt', {
    defaultMessage: 'Date Updated',
  }),
  updated_by: i18n.translate('xpack.securitySolution.trustedapps.trustedapp.updatedBy', {
    defaultMessage: 'Updated By',
  }),
  description: i18n.translate('xpack.securitySolution.trustedapps.trustedapp.description', {
    defaultMessage: 'Description',
  }),
  effectScope: i18n.translate('xpack.securitySolution.trustedapps.trustedapp.effectScope', {
    defaultMessage: 'Effect scope',
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

export const CARD_DELETE_BUTTON_LABEL = i18n.translate(
  'xpack.securitySolution.trustedapps.card.removeButtonLabel',
  {
    defaultMessage: 'Remove',
  }
);

export const CARD_EDIT_BUTTON_LABEL = i18n.translate(
  'xpack.securitySolution.trustedapps.card.editButtonLabel',
  {
    defaultMessage: 'Edit',
  }
);

export const GRID_VIEW_TOGGLE_LABEL = i18n.translate(
  'xpack.securitySolution.trustedapps.view.toggle.grid',
  {
    defaultMessage: 'Grid view',
  }
);

export const LIST_VIEW_TOGGLE_LABEL = i18n.translate(
  'xpack.securitySolution.trustedapps.view.toggle.list',
  {
    defaultMessage: 'List view',
  }
);

export const CREATE_TRUSTED_APP_ERROR: { [K in string]: string } = {
  [`duplicatedEntry.${ConditionEntryField.HASH}`]: i18n.translate(
    'xpack.securitySolution.trustedapps.logicalConditionBuilder.entry.field.error.duplicated.hash',
    { defaultMessage: 'Hash value can only be used once. Please enter a single valid hash.' }
  ),
  [`duplicatedEntry.${ConditionEntryField.PATH}`]: i18n.translate(
    'xpack.securitySolution.trustedapps.logicalConditionBuilder.entry.field.error.duplicated.path',
    { defaultMessage: 'Path value can only be used once. Please enter a single valid path.' }
  ),
  [`duplicatedEntry.${ConditionEntryField.SIGNER}`]: i18n.translate(
    'xpack.securitySolution.trustedapps.logicalConditionBuilder.entry.field.error.duplicated.signature',
    {
      defaultMessage:
        'Signature value can only be used once. Please enter a single valid signature.',
    }
  ),
  [`invalidField.${ConditionEntryField.HASH}`]: i18n.translate(
    'xpack.securitySolution.trustedapps.logicalConditionBuilder.entry.field.error.invalid.hash',
    {
      defaultMessage:
        'An invalid Hash was entered. Please enter in a valid Hash (md5, sha1, or sha256).',
    }
  ),
  [`invalidField.${ConditionEntryField.PATH}`]: i18n.translate(
    'xpack.securitySolution.trustedapps.logicalConditionBuilder.entry.field.error.invalid.path',
    { defaultMessage: 'An invalid Path was entered. Please enter in a valid Path.' }
  ),
  [`invalidField.${ConditionEntryField.SIGNER}`]: i18n.translate(
    'xpack.securitySolution.trustedapps.logicalConditionBuilder.entry.field.error.invalid.signature',
    { defaultMessage: 'An invalid Signature was entered. Please enter in a valid Signature.' }
  ),
};
