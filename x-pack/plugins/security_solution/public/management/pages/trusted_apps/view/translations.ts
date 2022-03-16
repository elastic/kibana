/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ConditionEntryField } from '@kbn/securitysolution-utils';
import {
  MacosLinuxConditionEntry,
  WindowsConditionEntry,
  OperatorFieldIds,
} from '../../../../../common/endpoint/types';

export { OS_TITLES } from '../../../common/translations';

export const ABOUT_TRUSTED_APPS = i18n.translate('xpack.securitySolution.trustedapps.aboutInfo', {
  defaultMessage:
    'Add a trusted application to improve performance or alleviate conflicts with other applications running on ' +
    'your hosts.',
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

export const ENTRY_PROPERTY_TITLES: Readonly<{
  [K in keyof Omit<MacosLinuxConditionEntry | WindowsConditionEntry, 'type'>]: string;
}> = {
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

export const SEARCH_TRUSTED_APP_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.trustedapps.list.search.placeholder',
  {
    defaultMessage: 'Search on the fields below: name, description, value',
  }
);
