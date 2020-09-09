/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';

import { UserIcon } from '../../../components/shared/user_icon';
import { MAX_TABLE_ROW_ICONS } from '../../../constants';

import { IUser } from '../../../types';

import { GroupRowUsersDropdown } from './group_row_users_dropdown';

interface IGroupUsersProps {
  groupUsers: IUser[];
  usersCount: number;
  groupId: string;
}

export const GroupUsers: React.FC<IGroupUsersProps> = ({ groupUsers, usersCount, groupId }) => {
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
