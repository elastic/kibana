/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiComboBox, EuiText } from '@elastic/eui';
import { Role, isRoleDeprecated } from '../../../common/model';

interface Props {
  availableRoles: Role[];
  selectedRoleNames: string[];
  onChange: (selectedRoleNames: string[]) => void;
  placeholder?: string;
  isLoading?: boolean;
  isDisabled?: boolean;
}

export const RoleComboBox = (props: Props) => {
  const onRolesChange = (selectedItems: Array<{ label: string }>) => {
    props.onChange(selectedItems.map(item => item.label));
  };

  const roleNameToOption = (roleName: string) => {
    const roleDefinition = props.availableRoles.find(role => role.name === roleName);
    const isDeprecated = roleDefinition && isRoleDeprecated(roleDefinition);
    return {
      color: isDeprecated ? 'warning' : 'default',
      'data-test-subj': `roleOption-${roleName}`,
      label: roleName,
      value: {
        isDeprecated,
      },
    };
  };

  const options = props.availableRoles.map(role => roleNameToOption(role.name));

  const selectedOptions = props.selectedRoleNames.map(roleNameToOption);

  return (
    <EuiComboBox
      data-test-subj="rolesDropdown"
      placeholder={
        props.placeholder ||
        i18n.translate('xpack.security.management.users.editUser.addRolesPlaceholder', {
          defaultMessage: 'Add roles',
        })
      }
      onChange={onRolesChange}
      isLoading={props.isLoading}
      isDisabled={props.isDisabled}
      options={options}
      selectedOptions={selectedOptions}
      renderOption={option => {
        const isDeprecated = option.value!.isDeprecated;
        const deprecatedLabel = i18n.translate(
          'xpack.security.management.users.editUser.deprecatedRoleText',
          {
            defaultMessage: '(deprecated)',
          }
        );
        return (
          <EuiText color={option.color as any}>
            {option.label} {isDeprecated ? deprecatedLabel : ''}
          </EuiText>
        );
      }}
    />
  );
};
