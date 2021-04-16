/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useParams } from 'react-router-dom';

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
import { i18n } from '@kbn/i18n';

import { FlashMessages } from '../../../shared/flash_messages';
import { SetWorkplaceSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';
import { Loading } from '../../../shared/loading';
import {
  AttributeSelector,
  DeleteMappingCallout,
  RoleSelector,
} from '../../../shared/role_mapping';
import {
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
  type: Role;
  description: string;
}

const roleTypes = [
  {
    type: 'admin',
    description: ADMIN_ROLE_TYPE_DESCRIPTION,
  },
  {
    type: 'user',
    description: USER_ROLE_TYPE_DESCRIPTION,
  },
] as RoleType[];

interface RoleMappingProps {
  isNew?: boolean;
}

export const RoleMapping: React.FC<RoleMappingProps> = ({ isNew }) => {
  const { roleId } = useParams() as { roleId: string };
  const {
    initializeRoleMappings,
    initializeRoleMapping,
    handleSaveMapping,
    handleGroupSelectionChange,
    handleAllGroupsSelectionChange,
    handleAttributeValueChange,
    handleAttributeSelectorChange,
    handleDeleteMapping,
    handleRoleChange,
    handleAuthProviderChange,
    resetState,
  } = useActions(RoleMappingsLogic);

  const {
    attributes,
    elasticsearchRoles,
    dataLoading,
    roleType,
    attributeValue,
    attributeName,
    availableGroups,
    selectedGroups,
    includeInAllGroups,
    availableAuthProviders,
    multipleAuthProvidersConfig,
    selectedAuthProviders,
  } = useValues(RoleMappingsLogic);

  useEffect(() => {
    initializeRoleMappings();
    initializeRoleMapping(roleId);
    return resetState;
  }, [roleId]);

  if (dataLoading) return <Loading />;

  const hasGroupAssignment = selectedGroups.size > 0 || includeInAllGroups;

  const TITLE = isNew ? ADD_ROLE_MAPPING_TITLE : MANAGE_ROLE_MAPPING_TITLE;
  const SAVE_ROLE_MAPPING_LABEL = i18n.translate(
    'xpack.enterpriseSearch.workplaceSearch.roleMapping.saveRoleMappingButtonMessage',
    {
      defaultMessage: '{operation} role mapping',
      values: { operation: isNew ? 'Save' : 'Update' },
    }
  );

  const saveRoleMappingButton = (
    <EuiButton disabled={!hasGroupAssignment} onClick={handleSaveMapping} fill>
      {SAVE_ROLE_MAPPING_LABEL}
    </EuiButton>
  );

  return (
    <>
      <SetPageChrome trail={[ROLE_MAPPINGS_TITLE, TITLE]} />
      <ViewContentHeader title={SAVE_ROLE_MAPPING_LABEL} action={saveRoleMappingButton} />
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
              {roleTypes.map(({ type, description }) => (
                <RoleSelector
                  key={type}
                  roleType={roleType}
                  onChange={handleRoleChange}
                  roleTypeOption={type}
                  description={description}
                />
              ))}
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
        <EuiSpacer />
        {!isNew && <DeleteMappingCallout handleDeleteMapping={handleDeleteMapping} />}
      </div>
    </>
  );
};
