/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiBadge, EuiBasicTableColumn, EuiInMemoryTable, EuiTextColor } from '@elastic/eui';

import { ASRoleMapping } from '../../app_search/types';
import { SingleUserRoleMapping } from '../../shared/types';
import { WSRoleMapping } from '../../workplace_search/types';

import {
  INVITATION_PENDING_LABEL,
  ALL_LABEL,
  FILTER_USERS_LABEL,
  NO_USERS_LABEL,
  ROLE_LABEL,
  USERNAME_LABEL,
  EMAIL_LABEL,
  GROUPS_LABEL,
  ENGINES_LABEL,
} from './constants';

import { UsersAndRolesRowActions } from './';

interface AccessItem {
  name: string;
}

interface SharedUser extends SingleUserRoleMapping<ASRoleMapping | WSRoleMapping> {
  accessItems: AccessItem[];
  username: string;
  email: string | null;
  roleType: string;
  id: string;
}

interface SharedRoleMapping extends ASRoleMapping, WSRoleMapping {
  accessItems: AccessItem[];
}

interface Props {
  accessItemKey: 'groups' | 'engines';
  singleUserRoleMappings: Array<SingleUserRoleMapping<ASRoleMapping | WSRoleMapping>>;
  initializeSingleUserRoleMapping(roleId: string): string;
  handleDeleteMapping(roleId: string): string;
}

const noItemsPlaceholder = <EuiTextColor color="subdued">&mdash;</EuiTextColor>;
const invitationBadge = <EuiBadge color="hollow">{INVITATION_PENDING_LABEL}</EuiBadge>;

export const UsersTable: React.FC<Props> = ({
  accessItemKey,
  singleUserRoleMappings,
  initializeSingleUserRoleMapping,
  handleDeleteMapping,
}) => {
  // 'accessItems' is needed because App Search has `engines` and Workplace Search has `groups`.
  const users = ((singleUserRoleMappings as SharedUser[]).map((user) => ({
    username: user.elasticsearchUser.username,
    email: user.elasticsearchUser.email,
    roleType: user.roleMapping.roleType,
    id: user.roleMapping.id,
    accessItems: (user.roleMapping as SharedRoleMapping)[accessItemKey],
    invitation: user.invitation,
  })) as unknown) as Array<Omit<SharedUser, 'elasticsearchUser | roleMapping'>>;

  const columns: Array<EuiBasicTableColumn<SharedUser>> = [
    {
      field: 'username',
      name: USERNAME_LABEL,
      render: (_, { username }: SharedUser) => username,
    },
    {
      field: 'email',
      name: EMAIL_LABEL,
      render: (_, { email, invitation }: SharedUser) => {
        if (!email) return noItemsPlaceholder;
        return (
          <div data-test-subj="EmailDisplayValue">
            {email} {invitation && invitationBadge}
          </div>
        );
      },
    },
    {
      field: 'roleType',
      name: ROLE_LABEL,
      render: (_, user: SharedUser) => user.roleType,
    },
    {
      field: 'accessItems',
      name: accessItemKey === 'groups' ? GROUPS_LABEL : ENGINES_LABEL,
      render: (_, { accessItems }: SharedUser) => {
        // Design calls for showing the first 2 items followed by a +x after those 2.
        // ['foo', 'bar', 'baz'] would display as: "foo, bar + 1"
        const numItems = accessItems.length;
        if (numItems === 0) return <span data-test-subj="AllItems">{ALL_LABEL}</span>;
        const additionalItems = numItems > 2 ? ` + ${numItems - 2}` : '';
        const names = accessItems.map((item) => item.name);
        return (
          <span data-test-subj="AccessItems">{names.slice(0, 2).join(', ') + additionalItems}</span>
        );
      },
    },
    {
      field: 'id',
      name: '',
      render: (_, { id, username }: SharedUser) => (
        <UsersAndRolesRowActions
          username={username}
          onManageClick={() => initializeSingleUserRoleMapping(id)}
          onDeleteClick={() => handleDeleteMapping(id)}
        />
      ),
    },
  ];

  const pagination = {
    hidePerPageOptions: true,
    pageSize: 10,
  };

  const search = {
    box: {
      incremental: true,
      fullWidth: false,
      placeholder: FILTER_USERS_LABEL,
      'data-test-subj': 'UsersTableSearchInput',
    },
  };

  return (
    <EuiInMemoryTable
      data-test-subj="UsersTable"
      columns={columns}
      items={users}
      search={search}
      pagination={pagination}
      message={NO_USERS_LABEL}
    />
  );
};
