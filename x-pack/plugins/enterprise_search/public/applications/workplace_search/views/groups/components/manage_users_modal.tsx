/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import { GroupLogic } from '../group_logic';
import { GroupsLogic } from '../groups_logic';

import { FilterableUsersList } from './filterable_users_list';
import { GroupManagerModal } from './group_manager_modal';

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
      label="users"
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
