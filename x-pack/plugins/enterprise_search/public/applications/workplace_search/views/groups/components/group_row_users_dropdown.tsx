/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import { EuiLoadingContent, EuiButtonEmpty } from '@elastic/eui';

import { GroupsLogic } from '../groups_logic';
import { FilterableUsersPopover } from './filterable_users_popover';

interface GroupRowUsersDropdownProps {
  isPopoverOpen: boolean;
  numOptions: number;
  groupId: string;
  onButtonClick(): void;
  closePopover(): void;
}

export const GroupRowUsersDropdown: React.FC<GroupRowUsersDropdownProps> = ({
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

  const toggleLink = (
    <EuiButtonEmpty className="user-group-source--additional" onClick={handleLinkClick}>
      + {numOptions}
    </EuiButtonEmpty>
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
