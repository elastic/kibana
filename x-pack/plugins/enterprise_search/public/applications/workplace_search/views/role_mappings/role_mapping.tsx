/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiButton,
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';

import { FlashMessages } from '../../../shared/flash_messages';
import { SetWorkplaceSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';
import { AttributeSelector, RoleSelector } from '../../../shared/role_mapping';
import {
  SAVE_ROLE_MAPPING,
  UPDATE_ROLE_MAPPING,
  ROLE_LABEL,
  ROLE_MAPPINGS_TITLE,
  ADD_ROLE_MAPPING_TITLE,
  MANAGE_ROLE_MAPPING_TITLE,
} from '../../../shared/role_mapping/constants';
import { ViewContentHeader } from '../../components/shared/view_content_header';
import { Role } from '../../types';

import {
  ADMIN_ROLE_TYPE_DESCRIPTION,
  USER_ROLE_TYPE_DESCRIPTION,
  GROUP_ASSIGNMENT_TITLE,
  GROUP_ASSIGNMENT_INVALID_ERROR,
  GROUP_ASSIGNMENT_ALL_GROUPS_LABEL,
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

export const RoleMapping: React.FC = () => {
  const {
    handleSaveMapping,
    handleGroupSelectionChange,
    handleAllGroupsSelectionChange,
    handleAttributeValueChange,
    handleAttributeSelectorChange,
    handleRoleChange,
    handleAuthProviderChange,
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
    roleMapping,
  } = useValues(RoleMappingsLogic);

  const isNew = !roleMapping;

  const hasGroupAssignment = selectedGroups.size > 0 || includeInAllGroups;

  const TITLE = isNew ? ADD_ROLE_MAPPING_TITLE : MANAGE_ROLE_MAPPING_TITLE;
  const SAVE_ROLE_MAPPING_LABEL = isNew ? SAVE_ROLE_MAPPING : UPDATE_ROLE_MAPPING;

  const saveRoleMappingButton = (
    <EuiButton disabled={!hasGroupAssignment} onClick={handleSaveMapping} fill>
      {SAVE_ROLE_MAPPING_LABEL}
    </EuiButton>
  );

  return (
    <>
      <SetPageChrome trail={[ROLE_MAPPINGS_TITLE, TITLE]} />
      <ViewContentHeader title={TITLE} action={saveRoleMappingButton} />
      <EuiSpacer size="l" />
      <div>
        <FlashMessages />
        <AttributeSelector
          attributeName={attributeName}
          attributeValue={attributeValue}
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
        <EuiSpacer />
        <EuiFlexGroup alignItems="stretch">
          <EuiFlexItem>
            <EuiPanel hasShadow={false} color="subdued" paddingSize="l">
              <EuiTitle size="s">
                <h3>{ROLE_LABEL}</h3>
              </EuiTitle>
              <EuiSpacer />
              <RoleSelector
                roleOptions={roleOptions}
                roleType={roleType}
                onChange={handleRoleChange}
                label="Role"
              />
            </EuiPanel>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiPanel hasShadow={false} color="subdued" paddingSize="l">
              <EuiTitle size="s">
                <h3>{GROUP_ASSIGNMENT_TITLE}</h3>
              </EuiTitle>
              <EuiSpacer />
              <div>
                <EuiFormRow
                  isInvalid={!hasGroupAssignment}
                  error={[GROUP_ASSIGNMENT_INVALID_ERROR]}
                >
                  <>
                    {availableGroups.map(({ id, name }) => (
                      <EuiCheckbox
                        key={id}
                        name={name}
                        id={id}
                        checked={selectedGroups.has(id)}
                        onChange={(e) => {
                          handleGroupSelectionChange(id, e.target.checked);
                        }}
                        label={name}
                        disabled={includeInAllGroups}
                      />
                    ))}
                    <EuiSpacer />
                    <EuiCheckbox
                      key="allGroups"
                      name="allGroups"
                      id="allGroups"
                      checked={includeInAllGroups}
                      onChange={(e) => {
                        handleAllGroupsSelectionChange(e.target.checked);
                      }}
                      label={GROUP_ASSIGNMENT_ALL_GROUPS_LABEL}
                    />
                  </>
                </EuiFormRow>
              </div>
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </>
  );
};
