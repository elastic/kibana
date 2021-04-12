/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { UserIcon } from '../../../components/shared/user_icon';
import { MAX_TABLE_ROW_ICONS } from '../../../constants';
import { User } from '../../../types';

import { GroupRowUsersDropdown } from './group_row_users_dropdown';

interface GroupUsersProps {
  groupUsers: User[];
  usersCount: number;
  groupId: string;
}

export const GroupUsers: React.FC<GroupUsersProps> = ({ groupUsers, usersCount, groupId }) => {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const closePopover = () => setPopoverOpen(false);
  const togglePopover = () => setPopoverOpen(!popoverOpen);
  const hiddenUsers = [...groupUsers];
  const visibleUsers = hiddenUsers.splice(0, MAX_TABLE_ROW_ICONS);

  return (
    <>
      {visibleUsers.map((user, index) => (
        <UserIcon {...user} key={index} />
      ))}
      {hiddenUsers.length > 0 && (
        <GroupRowUsersDropdown
          isPopoverOpen={popoverOpen}
          numOptions={usersCount - MAX_TABLE_ROW_ICONS}
          groupId={groupId}
          onButtonClick={togglePopover}
          closePopover={closePopover}
        />
      )}
    </>
  );
};
