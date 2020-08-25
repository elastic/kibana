/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import { EuiFilterButton } from '@elastic/eui';

import { GroupsLogic, IGroupsActions, IGroupsValues } from '../GroupsLogic';
import FilterableUsersPopover from './FilterableUsersPopover';

export const TableFilterUsersDropdown: React.FC<{}> = () => {
  const { closeFilterUsersDropdown, toggleFilterUsersDropdown } = useActions(
    GroupsLogic
  ) as IGroupsActions;
  const { filteredUsers, filterUsersDropdownOpen, users } = useValues(GroupsLogic) as IGroupsValues;

  const filterButton = (
    <EuiFilterButton
      iconType="arrowDown"
      onClick={toggleFilterUsersDropdown}
      isSelected={filterUsersDropdownOpen}
      numFilters={users.length}
      hasActiveFilters={filteredUsers.length > 0}
      numActiveFilters={filteredUsers.length}
    >
      Users
    </EuiFilterButton>
  );

  return (
    <FilterableUsersPopover
      users={users}
      selectedOptions={filteredUsers}
      itemsClickable={true}
      isPopoverOpen={filterUsersDropdownOpen}
      button={filterButton}
      closePopover={closeFilterUsersDropdown}
    />
  );
};
