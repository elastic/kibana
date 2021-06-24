/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiFieldText,
  EuiRadio,
  EuiFormRow,
  EuiSelect,
  EuiSelectOption,
  EuiSpacer,
} from '@elastic/eui';

import { Role as ASRole } from '../../app_search/types';
import { ElasticsearchUser } from '../../shared/types';
import { Role as WSRole } from '../../workplace_search/types';

import { USERNAME_LABEL, EMAIL_LABEL } from '../constants';

import {
  NEW_USER_LABEL,
  EXISTING_USER_LABEL,
  USERNAME_NO_USERS_TEXT,
  REQUIRED_LABEL,
  ROLE_LABEL,
} from './constants';

type SharedRole = WSRole | ASRole;

interface Props {
  isNewUser: boolean;
  userFormUserIsExisting: boolean;
  elasticsearchUsers: ElasticsearchUser[];
  elasticsearchUser: ElasticsearchUser;
  roleTypes: SharedRole[];
  roleType: SharedRole;
  setUserExisting(userFormUserIsExisting: boolean): void;
  setElasticsearchUsernameValue(username: string): void;
  setElasticsearchEmailValue(email: string): void;
  handleRoleChange(roleType: SharedRole): void;
  handleUsernameSelectChange(username: string): void;
}

export const UserSelector: React.FC<Props> = ({
  isNewUser,
  userFormUserIsExisting,
  elasticsearchUsers,
  elasticsearchUser,
  roleTypes,
  roleType,
  setUserExisting,
  setElasticsearchUsernameValue,
  setElasticsearchEmailValue,
  handleRoleChange,
  handleUsernameSelectChange,
}) => {
  const roleOptions = roleTypes.map((role) => ({ id: role, text: role }));
  const usernameOptions = elasticsearchUsers.map(({ username }) => ({
    id: username,
    text: username,
  }));
  const hasElasticsearchUsers = elasticsearchUsers.length > 0;
  const showNewUserExistingUserControls = userFormUserIsExisting && hasElasticsearchUsers;

  const roleSelect = (
    <EuiFormRow label={ROLE_LABEL}>
      <EuiSelect
        name={ROLE_LABEL}
        data-test-subj="RoleSelect"
        options={roleOptions as EuiSelectOption[]}
        value={roleType as string}
        onChange={(e) => handleRoleChange(e.target.value as SharedRole)}
      />
    </EuiFormRow>
  );

  const emailInput = (
    <EuiFormRow label={EMAIL_LABEL} helpText={!elasticsearchUser.email && REQUIRED_LABEL}>
      <EuiFieldText
        name={EMAIL_LABEL}
        data-test-subj="EmailInput"
        value={elasticsearchUser.email as string}
        onChange={(e) => setElasticsearchEmailValue(e.target.value)}
      />
    </EuiFormRow>
  );

  const usernameAndEmailControls = (
    <>
      <EuiFormRow label={USERNAME_LABEL} helpText={!elasticsearchUser.username && REQUIRED_LABEL}>
        <EuiFieldText
          name={USERNAME_LABEL}
          data-test-subj="UsernameInput"
          value={elasticsearchUser.username}
          onChange={(e) => setElasticsearchUsernameValue(e.target.value)}
        />
      </EuiFormRow>
      {elasticsearchUser.email !== null && emailInput}
      {roleSelect}
    </>
  );

  const existingUserControls = (
    <>
      <EuiSpacer size="s" />
      <EuiFormRow label={USERNAME_LABEL}>
        <EuiSelect
          name="Username select"
          data-test-subj="UsernameSelect"
          options={usernameOptions}
          value={elasticsearchUser.username}
          disabled={!hasElasticsearchUsers}
          onChange={(e) => handleUsernameSelectChange(e.target.value)}
        />
      </EuiFormRow>
      {roleSelect}
    </>
  );

  const newUserControls = (
    <>
      <EuiSpacer size="s" />
      {usernameAndEmailControls}
    </>
  );

  const createUserControls = (
    <>
      <EuiFormRow helpText={!hasElasticsearchUsers && USERNAME_NO_USERS_TEXT}>
        <EuiRadio
          id="existingUser"
          data-test-subj="ExistingUserRadio"
          label={EXISTING_USER_LABEL}
          checked={userFormUserIsExisting && hasElasticsearchUsers}
          onChange={() => setUserExisting(true)}
          disabled={!hasElasticsearchUsers}
        />
      </EuiFormRow>

      {showNewUserExistingUserControls && existingUserControls}
      <EuiSpacer />
      <EuiRadio
        id="newUser"
        data-test-subj="NewUserRadio"
        label={NEW_USER_LABEL}
        checked={!userFormUserIsExisting || !hasElasticsearchUsers}
        onChange={() => setUserExisting(false)}
      />
      {!showNewUserExistingUserControls && newUserControls}
    </>
  );

  return isNewUser ? createUserControls : usernameAndEmailControls;
};
