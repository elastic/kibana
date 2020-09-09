/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import { GroupLogic, IGroupValues, IGroupActions } from '../GroupLogic';
import { GroupsLogic, IGroupsValues } from '../GroupsLogic';

import FilterableUsersList from './FilterableUsersList';
import GroupManagerModal from './GroupManagerModal';

export const ManageUsersModal: React.FC<{}> = () => {
  const {
    addGroupUser,
    removeGroupUser,
    selectAllUsers,
    hideManageUsersModal,
    saveGroupUsers,
  } = useActions(GroupLogic) as IGroupActions;

  const { selectedGroupUsers } = useValues(GroupLogic) as IGroupValues;
  const { users } = useValues(GroupsLogic) as IGroupsValues;

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
