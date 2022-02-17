/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import { EuiForm, EuiSpacer } from '@elastic/eui';

import { AttributeSelector, RoleSelector, RoleMappingFlyout } from '../../../shared/role_mapping';

import { Role } from '../../types';

import { ADMIN_ROLE_TYPE_DESCRIPTION, USER_ROLE_TYPE_DESCRIPTION } from './constants';

import { GroupAssignmentSelector } from './group_assignment_selector';
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

export const RoleMapping: React.FC = () => {
  const {
    handleSaveMapping,
    handleAttributeValueChange,
    handleAttributeSelectorChange,
    handleRoleChange,
    closeUsersAndRolesFlyout,
  } = useActions(RoleMappingsLogic);

  const {
    attributes,
    elasticsearchRoles,
    roleType,
    attributeValue,
    attributeName,
    selectedGroups,
    includeInAllGroups,
    roleMapping,
    roleMappingErrors,
    formLoading,
  } = useValues(RoleMappingsLogic);

  const isNew = !roleMapping;

  const hasGroupAssignment = selectedGroups.size > 0 || includeInAllGroups;
  const attributeValueInvalid = attributeName !== 'role' && !attributeValue;

  return (
    <RoleMappingFlyout
      disabled={attributeValueInvalid || !hasGroupAssignment}
      formLoading={formLoading}
      isNew={isNew}
      closeUsersAndRolesFlyout={closeUsersAndRolesFlyout}
      handleSaveMapping={handleSaveMapping}
    >
      <EuiForm isInvalid={roleMappingErrors.length > 0} error={roleMappingErrors}>
        <AttributeSelector
          attributeName={attributeName}
          attributeValue={attributeValue}
          attributeValueInvalid={attributeValueInvalid}
          attributes={attributes}
          elasticsearchRoles={elasticsearchRoles}
          disabled={!isNew}
          handleAttributeSelectorChange={handleAttributeSelectorChange}
          handleAttributeValueChange={handleAttributeValueChange}
        />
        <EuiSpacer size="m" />
        <RoleSelector
          roleOptions={roleOptions}
          roleType={roleType}
          onChange={handleRoleChange}
          label="Role"
        />
        <GroupAssignmentSelector />
      </EuiForm>
    </RoleMappingFlyout>
  );
};
