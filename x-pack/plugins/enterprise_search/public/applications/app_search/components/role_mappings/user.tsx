/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import { EuiForm } from '@elastic/eui';

import { getAppSearchUrl } from '../../../shared/enterprise_search_url';
import {
  UserFlyout,
  UserSelector,
  UserAddedInfo,
  UserInvitationCallout,
  DeactivatedUserCallout,
} from '../../../shared/role_mapping';
import { RoleTypes } from '../../types';

import { EngineAssignmentSelector } from './engine_assignment_selector';
import { RoleMappingsLogic } from './role_mappings_logic';

const standardRoles = ['owner', 'admin'] as unknown as RoleTypes[];
const advancedRoles = ['dev', 'editor', 'analyst'] as unknown as RoleTypes[];

export const User: React.FC = () => {
  const {
    handleSaveUser,
    closeUsersAndRolesFlyout,
    setUserExistingRadioValue,
    setElasticsearchUsernameValue,
    setElasticsearchEmailValue,
    handleRoleChange,
    handleUsernameSelectChange,
  } = useActions(RoleMappingsLogic);

  const {
    availableEngines,
    singleUserRoleMapping,
    hasAdvancedRoles,
    userFormUserIsExisting,
    elasticsearchUsers,
    elasticsearchUser,
    roleType,
    roleMappingErrors,
    userCreated,
    userFormIsNewUser,
    smtpSettingsPresent,
    formLoading,
  } = useValues(RoleMappingsLogic);

  const roleTypes = hasAdvancedRoles ? [...standardRoles, ...advancedRoles] : standardRoles;
  const hasEngines = availableEngines.length > 0;
  const showEngineAssignmentSelector = hasEngines && hasAdvancedRoles;
  const flyoutDisabled =
    !userFormUserIsExisting && (!elasticsearchUser.email || !elasticsearchUser.username);
  const userIsDeactivated = !!(
    singleUserRoleMapping &&
    !singleUserRoleMapping.invitation &&
    !singleUserRoleMapping.elasticsearchUser.enabled
  );

  const userAddedInfo = singleUserRoleMapping && (
    <UserAddedInfo
      username={singleUserRoleMapping.elasticsearchUser.username}
      email={singleUserRoleMapping.elasticsearchUser.email as string}
      roleType={singleUserRoleMapping.roleMapping.roleType}
      showKibanaAccessWarning={!singleUserRoleMapping.hasEnterpriseSearchRole}
    />
  );

  const userInvitationCallout = singleUserRoleMapping?.invitation && (
    <UserInvitationCallout
      isNew={userCreated}
      invitationCode={singleUserRoleMapping!.invitation.code}
      urlPrefix={getAppSearchUrl()}
    />
  );

  const createUserForm = (
    <EuiForm isInvalid={roleMappingErrors.length > 0} error={roleMappingErrors}>
      <UserSelector
        isNewUser={userFormIsNewUser}
        smtpSettingsPresent={smtpSettingsPresent}
        elasticsearchUsers={elasticsearchUsers}
        handleRoleChange={handleRoleChange}
        elasticsearchUser={elasticsearchUser}
        setUserExisting={setUserExistingRadioValue}
        setElasticsearchEmailValue={setElasticsearchEmailValue}
        setElasticsearchUsernameValue={setElasticsearchUsernameValue}
        handleUsernameSelectChange={handleUsernameSelectChange}
        userFormUserIsExisting={userFormUserIsExisting}
        roleTypes={roleTypes}
        roleType={roleType}
      />
      {showEngineAssignmentSelector && <EngineAssignmentSelector />}
    </EuiForm>
  );

  return (
    <UserFlyout
      disabled={flyoutDisabled}
      formLoading={formLoading}
      isComplete={userCreated}
      isNew={userFormIsNewUser}
      closeUserFlyout={closeUsersAndRolesFlyout}
      handleSaveUser={handleSaveUser}
    >
      {userCreated ? userAddedInfo : createUserForm}
      {userInvitationCallout}
      {userIsDeactivated && <DeactivatedUserCallout isNew={userFormIsNewUser} />}
    </UserFlyout>
  );
};
