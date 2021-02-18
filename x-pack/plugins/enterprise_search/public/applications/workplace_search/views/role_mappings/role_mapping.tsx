/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { withRouter } from 'react-router-dom';

import { useActions, useValues } from 'kea';

import FlashMessages from 'shared/components/FlashMessages';

import {
  AttributeSelector,
  DeleteMappingCallout,
  RoleSelector,
} from 'shared/components/RoleMapping';

import { Loading, ViewContentHeader } from 'workplace_search/components';
import { Router } from 'workplace_search/types';

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

import { RoleMappingsLogic } from './RoleMappingsLogic';

const roleTypes = [
  {
    type: 'admin',
    description:
      'Admins have complete access to all organization-wide settings, including content source, group and user management functionality.',
  },
  {
    type: 'user',
    description:
      "Users' feature access is limited to search interfaces and personal settings management.",
  },
];

interface RoleMappingProps extends Router {
  isNew?: boolean;
}

export const RoleMapping: React.FC<RoleMappingProps> = ({
  isNew,
  history,
  match: {
    params: { roleId },
  },
}) => {
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
    flashMessages,
    roleType,
    roleMappings,
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
    initializeRoleMapping(history, roleId);
    return resetState;
  }, [roleId]);

  if (dataLoading) return <Loading />;

  const hasGroupAssignment = selectedGroups.size > 0 || includeInAllGroups;

  const saveRoleMappingButton = (
    <EuiButton disabled={!hasGroupAssignment} onClick={handleSaveMapping} fill>
      {isNew ? 'Save' : 'Update'} role mapping
    </EuiButton>
  );

  const hasAdminRoleMapping = roleMappings.some(
    ({ roleType: roleMappingRoleType }) => roleMappingRoleType === 'admin'
  );

  return (
    <>
      <ViewContentHeader
        title={`${isNew ? 'Save' : 'Update'} role mapping`}
        action={saveRoleMappingButton}
      />
      <EuiSpacer size="l" />
      <div>
        {flashMessages && <FlashMessages {...flashMessages} />}
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
            <EuiPanel paddingSize="l">
              <EuiTitle size="s">
                <h3>Role</h3>
              </EuiTitle>
              <EuiSpacer />
              {roleTypes.map(({ type, description }) => (
                <RoleSelector
                  key={type}
                  roleType={roleType}
                  onChange={handleRoleChange}
                  roleTypeOption={type}
                  description={description}
                  disabled={!(type === 'admin' || hasAdminRoleMapping)}
                  disabledText={
                    'You need at least one admin role mapping before you can create a user role mapping.'
                  }
                />
              ))}
            </EuiPanel>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiPanel paddingSize="l">
              <EuiTitle size="s">
                <h3>Group assignment</h3>
              </EuiTitle>
              <EuiSpacer />
              <div className="engines-list">
                <EuiFormRow
                  isInvalid={!hasGroupAssignment}
                  error={['At least one assigned group is required.']}
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
                      label="Include in all groups, including future groups"
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
