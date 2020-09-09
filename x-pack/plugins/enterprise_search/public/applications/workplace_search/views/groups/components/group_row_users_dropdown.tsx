/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import { EuiLoadingContent } from '@elastic/eui';

import { GroupsLogic } from '../groups_logic';
import { FilterableUsersPopover } from './filterable_users_popover';

interface IGroupRowUsersDropdownProps {
  isPopoverOpen: boolean;
  numOptions: number;
  groupId: string;
  onButtonClick(): void;
  closePopover(): void;
}

export const GroupRowUsersDropdown: React.FC<IGroupRowUsersDropdownProps> = ({
  isPopoverOpen,
  numOptions,
  groupId,
  onButtonClick,
  closePopover,
}) => {
  const { fetchGroupUsers } = useActions(GroupsLogic);
  const { allGroupUsersLoading, allGroupUsers } = useValues(GroupsLogic);

  const handleLinkClick = () => {
    fetchGroupUsers(groupId);
    onButtonClick();
  };

  // TODO: Add keydown handler
  const toggleLink = (
    <a className="user-group-source--additional" onKeyDown={(e) => null} onClick={handleLinkClick}>
      + {numOptions}
    </a>
  );

  return (
    <FilterableUsersPopover
      users={allGroupUsers}
      isPopoverOpen={isPopoverOpen}
      allGroupUsersLoading={allGroupUsersLoading ? <EuiLoadingContent lines={6} /> : undefined}
      className="user-group-source--additional__wrap"
      button={toggleLink}
      closePopover={closePopover}
    />
  );
};
