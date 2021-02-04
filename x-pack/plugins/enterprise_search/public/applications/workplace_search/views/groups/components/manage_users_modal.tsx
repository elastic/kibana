/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import { i18n } from '@kbn/i18n';

import { GroupLogic } from '../group_logic';
import { GroupsLogic } from '../groups_logic';

import { FilterableUsersList } from './filterable_users_list';
import { GroupManagerModal } from './group_manager_modal';

const MODAL_LABEL = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.groups.usersModalLabel',
  {
    defaultMessage: 'users',
  }
);

export const ManageUsersModal: React.FC = () => {
  const {
    addGroupUser,
    removeGroupUser,
    selectAllUsers,
    hideManageUsersModal,
    saveGroupUsers,
  } = useActions(GroupLogic);

  const { selectedGroupUsers } = useValues(GroupLogic);
  const { users } = useValues(GroupsLogic);

  return (
    <GroupManagerModal
      label={MODAL_LABEL}
      allItems={users}
      numSelected={selectedGroupUsers.length}
      hideModal={hideManageUsersModal}
      selectAll={selectAllUsers}
      saveItems={saveGroupUsers}
    >
      <FilterableUsersList
        users={users}
        selectedOptions={selectedGroupUsers}
        itemsClickable
        addFilteredUser={addGroupUser}
        removeFilteredUser={removeGroupUser}
      />
    </GroupManagerModal>
  );
};
