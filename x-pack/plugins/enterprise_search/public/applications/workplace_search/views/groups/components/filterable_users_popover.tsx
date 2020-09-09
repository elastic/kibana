/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { useActions } from 'kea';

import { EuiFilterGroup, EuiPopover } from '@elastic/eui';

import { IUser } from '../../../types';

import { GroupsLogic } from '../groups_logic';
import { FilterableUsersList } from './filterable_users_list';

interface IIFilterableUsersPopoverProps {
  users: IUser[];
  selectedOptions?: string[];
  itemsClickable?: boolean;
  isPopoverOpen: boolean;
  allGroupUsersLoading?: React.ReactElement;
  className?: string;
  button: React.ReactElement;
  closePopover(): void;
}

export const FilterableUsersPopover: React.FC<IIFilterableUsersPopoverProps> = ({
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
        ownFocus={true}
        button={button}
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        panelPaddingSize="none"
        withTitle={true}
      >
        <FilterableUsersList
          users={users}
          selectedOptions={selectedOptions}
          itemsClickable={itemsClickable}
          addFilteredUser={addFilteredUser}
          allGroupUsersLoading={allGroupUsersLoading}
          removeFilteredUser={removeFilteredUser}
          isPopover={true}
        />
      </EuiPopover>
    </EuiFilterGroup>
  );
};
