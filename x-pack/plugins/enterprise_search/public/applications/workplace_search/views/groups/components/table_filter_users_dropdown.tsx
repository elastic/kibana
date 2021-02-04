/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import { i18n } from '@kbn/i18n';

import { EuiFilterButton } from '@elastic/eui';

import { GroupsLogic } from '../groups_logic';
import { FilterableUsersPopover } from './filterable_users_popover';

const FILTER_USERS_BUTTON_TEXT = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.groups.filterUsers.buttonText',
  {
    defaultMessage: 'Users',
  }
);

export const TableFilterUsersDropdown: React.FC<{}> = () => {
  const { closeFilterUsersDropdown, toggleFilterUsersDropdown } = useActions(GroupsLogic);
  const { filteredUsers, filterUsersDropdownOpen, users } = useValues(GroupsLogic);

  const filterButton = (
    <EuiFilterButton
      iconType="arrowDown"
      onClick={toggleFilterUsersDropdown}
      isSelected={filterUsersDropdownOpen}
      numFilters={users.length}
      hasActiveFilters={filteredUsers.length > 0}
      numActiveFilters={filteredUsers.length}
    >
      {FILTER_USERS_BUTTON_TEXT}
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
