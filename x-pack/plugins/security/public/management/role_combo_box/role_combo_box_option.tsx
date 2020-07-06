/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import { EuiComboBoxOptionOption, EuiText } from '@elastic/eui';

interface Props {
  option: EuiComboBoxOptionOption<{ isDeprecated: boolean }>;
}

export const RoleComboBoxOption = ({ option }: Props) => {
  const isDeprecated = option.value?.isDeprecated ?? false;
  const deprecatedLabel = i18n.translate(
    'xpack.security.management.users.editUser.deprecatedRoleText',
    {
      defaultMessage: '(deprecated)',
    }
  );

  return (
    <EuiText color={option.color as any} data-test-subj="rolesDropdown-renderOption">
      {option.label} {isDeprecated ? deprecatedLabel : ''}
    </EuiText>
  );
};
