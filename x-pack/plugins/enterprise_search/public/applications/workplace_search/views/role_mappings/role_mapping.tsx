/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import { EuiComboBox, EuiFormRow, EuiHorizontalRule, EuiRadioGroup, EuiSpacer } from '@elastic/eui';

import {
  AttributeSelector,
  RoleSelector,
  RoleOptionLabel,
  RoleMappingFlyout,
} from '../../../shared/role_mapping';

import { Role } from '../../types';

import {
  ADMIN_ROLE_TYPE_DESCRIPTION,
  USER_ROLE_TYPE_DESCRIPTION,
  GROUP_ASSIGNMENT_INVALID_ERROR,
  GROUP_ASSIGNMENT_LABEL,
  ALL_GROUPS_LABEL,
  ALL_GROUPS_DESCRIPTION,
  SPECIFIC_GROUPS_LABEL,
  SPECIFIC_GROUPS_DESCRIPTION,
} from './constants';

import { RoleMappingsLogic } from './role_mappings_logic';

interface RoleType {
  id: Role;
  description: string;
}

const roleOptions = [
  {
    id: 'admin',
    description: ADMIN_ROLE_TYPE_DESCRIPTION,
  },
  {
    id: 'user',
    description: USER_ROLE_TYPE_DESCRIPTION,
  },
] as RoleType[];

const groupOptions = [
  {
    id: 'all',
    label: <RoleOptionLabel label={ALL_GROUPS_LABEL} description={ALL_GROUPS_DESCRIPTION} />,
  },
  {
    id: 'specific',
    label: (
      <RoleOptionLabel label={SPECIFIC_GROUPS_LABEL} description={SPECIFIC_GROUPS_DESCRIPTION} />
    ),
  },
];

export const RoleMapping: React.FC = () => {
  const {
    handleSaveMapping,
    handleGroupSelectionChange,
    handleAllGroupsSelectionChange,
    handleAttributeValueChange,
    handleAttributeSelectorChange,
    handleRoleChange,
    handleAuthProviderChange,
    closeRoleMappingFlyout,
  } = useActions(RoleMappingsLogic);

  const {
    attributes,
    elasticsearchRoles,
    roleType,
    attributeValue,
    attributeName,
    availableGroups,
    selectedGroups,
    includeInAllGroups,
    availableAuthProviders,
    multipleAuthProvidersConfig,
    selectedAuthProviders,
    selectedOptions,
    roleMapping,
  } = useValues(RoleMappingsLogic);

  const isNew = !roleMapping;

  const hasGroupAssignment = selectedGroups.size > 0 || includeInAllGroups;
  const attributeValueInvalid = attributeName !== 'role' && !attributeValue;

  return (
    <RoleMappingFlyout
      disabled={attributeValueInvalid || !hasGroupAssignment}
      isNew={isNew}
      closeRoleMappingFlyout={closeRoleMappingFlyout}
      handleSaveMapping={handleSaveMapping}
    >
      <AttributeSelector
        attributeName={attributeName}
        attributeValue={attributeValue}
        attributeValueInvalid={attributeValueInvalid}
        attributes={attributes}
        elasticsearchRoles={elasticsearchRoles}
        disabled={!isNew}
        handleAttributeSelectorChange={handleAttributeSelectorChange}
        handleAttributeValueChange={handleAttributeValueChange}
        availableAuthProviders={availableAuthProviders}
        selectedAuthProviders={selectedAuthProviders}
        multipleAuthProvidersConfig={multipleAuthProvidersConfig}
        handleAuthProviderChange={handleAuthProviderChange}
      />
      <EuiSpacer size="m" />
      <RoleSelector
        roleOptions={roleOptions}
        roleType={roleType}
        onChange={handleRoleChange}
        label="Role"
      />
      <EuiHorizontalRule />
      <EuiFormRow>
        <EuiRadioGroup
          options={groupOptions}
          idSelected={includeInAllGroups ? 'all' : 'specific'}
          onChange={(id) => handleAllGroupsSelectionChange(id === 'all')}
          legend={{
            children: <span>{GROUP_ASSIGNMENT_LABEL}</span>,
          }}
        />
      </EuiFormRow>
      <EuiFormRow isInvalid={!hasGroupAssignment} error={[GROUP_ASSIGNMENT_INVALID_ERROR]}>
        <EuiComboBox
          data-test-subj="groupsSelect"
          selectedOptions={selectedOptions}
          options={availableGroups.map(({ name, id }) => ({ label: name, value: id }))}
          onChange={(options) => {
            handleGroupSelectionChange(options.map(({ value }) => value as string));
          }}
          fullWidth
          isDisabled={includeInAllGroups}
        />
      </EuiFormRow>
    </RoleMappingFlyout>
  );
};
