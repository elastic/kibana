/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions } from 'kea';

import { EuiFilterGroup, EuiPopover } from '@elastic/eui';

import { User } from '../../../types';
import { GroupsLogic } from '../groups_logic';

import { FilterableUsersList } from './filterable_users_list';

interface FilterableUsersPopoverProps {
  users: User[];
  selectedOptions?: string[];
  itemsClickable?: boolean;
  isPopoverOpen: boolean;
  allGroupUsersLoading?: React.ReactElement;
  className?: string;
  button: React.ReactElement;
  closePopover(): void;
}

export const FilterableUsersPopover: React.FC<FilterableUsersPopoverProps> = ({
  users,
  selectedOptions = [],
  itemsClickable,
  isPopoverOpen,
  allGroupUsersLoading,
  className,
  button,
  closePopover,
}) => {
  const { addFilteredUser, removeFilteredUser } = useActions(GroupsLogic);
  return (
    <EuiFilterGroup className={className}>
      <EuiPopover
        ownFocus
        button={button}
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        panelPaddingSize="none"
      >
        <FilterableUsersList
          users={users}
          selectedOptions={selectedOptions}
          itemsClickable={itemsClickable}
          addFilteredUser={addFilteredUser}
          allGroupUsersLoading={allGroupUsersLoading}
          removeFilteredUser={removeFilteredUser}
          isPopover
        />
      </EuiPopover>
    </EuiFilterGroup>
  );
};
