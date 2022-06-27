/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiComboBoxOptionOption, EuiComboBoxProps } from '@elastic/eui';
import { EuiBadge, EuiComboBox, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import type { Role } from '../../../common/model';
import { isRoleAdmin, isRoleDeprecated, isRoleReserved, isRoleSystem } from '../../../common/model';

interface Props
  extends Omit<
    EuiComboBoxProps<string>,
    'onChange' | 'options' | 'selectedOptions' | 'renderOption'
  > {
  availableRoles: Role[];
  selectedRoleNames: readonly string[];
  onChange: (selectedRoleNames: string[]) => void;
  placeholder?: string;
  isLoading?: boolean;
  isDisabled?: boolean;
}

type Option = EuiComboBoxOptionOption<{
  isReserved: boolean;
  isDeprecated: boolean;
  isSystem: boolean;
  isAdmin: boolean;
  deprecatedReason?: string;
}>;

export const RoleComboBox = (props: Props) => {
  const onRolesChange = (selectedItems: Array<{ label: string }>) => {
    props.onChange(selectedItems.map((item) => item.label));
  };

  const roleNameToOption = (roleName: string): Option => {
    const roleDefinition = props.availableRoles.find((role) => role.name === roleName);
    const isReserved: boolean = (roleDefinition && isRoleReserved(roleDefinition)) ?? false;
    const isDeprecated: boolean = (roleDefinition && isRoleDeprecated(roleDefinition)) ?? false;
    const isSystem: boolean = (roleDefinition && isRoleSystem(roleDefinition)) ?? false;
    const isAdmin: boolean = (roleDefinition && isRoleAdmin(roleDefinition)) ?? false;
    return {
      color: isDeprecated ? 'warning' : isReserved ? 'primary' : undefined,
      'data-test-subj': `roleOption-${roleName}`,
      label: roleName,
      value: {
        isReserved,
        isDeprecated,
        isSystem,
        isAdmin,
        deprecatedReason: roleDefinition?.metadata?._deprecated_reason,
      },
    };
  };

  const options = props.availableRoles.map((role) => roleNameToOption(role.name));
  const selectedOptions = props.selectedRoleNames.map(roleNameToOption);
  const groupedOptions = options.reduce<Record<string, typeof options>>((acc, option) => {
    const type = option.value?.isDeprecated
      ? 'deprecated'
      : option.value?.isSystem
      ? 'system'
      : option.value?.isAdmin
      ? 'admin'
      : option.value?.isReserved
      ? 'user'
      : 'custom';
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(option);
    return acc;
  }, {});

  return (
    <EuiComboBox
      data-test-subj="rolesDropdown"
      id={props.id}
      placeholder={
        props.placeholder ||
        i18n.translate('xpack.security.management.users.roleComboBox.placeholder', {
          defaultMessage: 'Select roles',
        })
      }
      onChange={onRolesChange}
      isLoading={props.isLoading}
      isDisabled={props.isDisabled}
      options={[
        {
          label: i18n.translate('xpack.security.management.users.roleComboBox.customRoles', {
            defaultMessage: 'Custom roles',
          }),
          options: groupedOptions.custom ?? [],
        },
        {
          label: i18n.translate('xpack.security.management.users.roleComboBox.userRoles', {
            defaultMessage: 'User roles',
          }),
          options: groupedOptions.user ?? [],
        },
        {
          label: i18n.translate('xpack.security.management.users.roleComboBox.AdminRoles', {
            defaultMessage: 'Admin roles',
          }),
          options: groupedOptions.admin ?? [],
        },
        {
          label: i18n.translate('xpack.security.management.users.roleComboBox.systemRoles', {
            defaultMessage: 'System roles',
          }),
          options: groupedOptions.system ?? [],
        },
        {
          label: i18n.translate('xpack.security.management.users.roleComboBox.deprecatedRoles', {
            defaultMessage: 'Deprecated roles',
          }),
          options: groupedOptions.deprecated ?? [],
        },
      ]}
      selectedOptions={selectedOptions}
      renderOption={renderOption}
    />
  );
};

function renderOption(option: Option) {
  return (
    <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
      <EuiFlexItem>{option.label}</EuiFlexItem>
      {option.value?.isDeprecated ? (
        <EuiFlexItem grow={false}>
          <EuiBadge color={option.color}>
            <FormattedMessage
              id="xpack.security.management.users.roleComboBox.deprecatedBadge"
              defaultMessage="deprecated"
            />
          </EuiBadge>
        </EuiFlexItem>
      ) : option.value?.isReserved ? (
        <EuiFlexItem grow={false}>
          <EuiBadge color={option.color}>
            <FormattedMessage
              id="xpack.security.management.users.roleComboBox.reservedBadge"
              defaultMessage="built in"
            />
          </EuiBadge>
        </EuiFlexItem>
      ) : undefined}
    </EuiFlexGroup>
  );
}
