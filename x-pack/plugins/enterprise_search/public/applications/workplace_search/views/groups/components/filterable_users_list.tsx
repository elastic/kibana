/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';

import { i18n } from '@kbn/i18n';

import {
  EuiCard,
  EuiFieldSearch,
  EuiFilterSelectItem,
  EuiIcon,
  EuiPopoverTitle,
  EuiSpacer,
} from '@elastic/eui';

import { IUser } from '../../../types';

import { UserOptionItem } from './user_option_item';

const MAX_VISIBLE_USERS = 20;

const FILTER_USERS_PLACEHOLDER = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.groups.filterUsers.placeholder',
  {
    defaultMessage: 'Filter users...',
  }
);
const NO_USERS_FOUND = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.groups.noUsersFound',
  {
    defaultMessage: 'No users found',
  }
);

interface FilterableUsersListProps {
  users: IUser[];
  selectedOptions?: string[];
  itemsClickable?: boolean;
  isPopover?: boolean;
  allGroupUsersLoading?: React.ReactElement;
  addFilteredUser(userId: string): void;
  removeFilteredUser(userId: string): void;
}

export const FilterableUsersList: React.FC<FilterableUsersListProps> = ({
  users,
  selectedOptions = [],
  itemsClickable,
  isPopover,
  addFilteredUser,
  allGroupUsersLoading,
  removeFilteredUser,
}) => {
  const [filterValue, updateValue] = useState('');

  const filterUsers = (userId: string): boolean => {
    if (!filterValue) return true;
    const filterUser = users.find(({ id }) => id === userId) as IUser;
    const filteredName = filterUser.name || filterUser.email;
    return filteredName.toLowerCase().indexOf(filterValue.toLowerCase()) > -1;
  };

  // Only show the first 20 users in the dropdown.
  const availableUsers = users.map(({ id }) => id).filter(filterUsers);
  const hiddenUsers = [...availableUsers];
  const visibleUsers = hiddenUsers.splice(0, MAX_VISIBLE_USERS);

  const getOptionEl = (userId: string, index: number): React.ReactElement => {
    const checked = selectedOptions.indexOf(userId) > -1 ? 'on' : undefined;
    const handleClick = () => (checked ? removeFilteredUser(userId) : addFilteredUser(userId));
    const user = users.filter(({ id }) => id === userId)[0];
    const option = <UserOptionItem user={user} />;

    return itemsClickable ? (
      <EuiFilterSelectItem key={index} checked={checked} onClick={handleClick}>
        {option}
      </EuiFilterSelectItem>
    ) : (
      <div key={index} className="euiFilterSelectItem user-group__item">
        {option}
      </div>
    );
  };

  const filterUsersBar = (
    <EuiFieldSearch
      value={filterValue}
      placeholder={FILTER_USERS_PLACEHOLDER}
      onChange={(e) => updateValue(e.target.value)}
    />
  );
  const noResults = (
    <>
      <EuiIcon type="minusInCircle" /> <span>{NO_USERS_FOUND}</span>
    </>
  );

  const options =
    visibleUsers.length > 0 ? (
      visibleUsers.map((userId, index) => getOptionEl(userId, index))
    ) : (
      <EuiCard
        title={<EuiSpacer size="xs" />}
        description={!!allGroupUsersLoading ? allGroupUsersLoading : noResults}
      />
    );

  const usersList = (
    <>
      {hiddenUsers.length > 0 && (
        <div className="euiFilterSelectItem">
          <small>
            {i18n.translate('xpack.enterpriseSearch.workplaceSearch.groups.userListCount', {
              defaultMessage: 'Showing {maxVisibleUsers} of {numUsers} users.',
              values: { maxVisibleUsers: MAX_VISIBLE_USERS, numUsers: availableUsers.length },
            })}
          </small>
        </div>
      )}
      {options}
    </>
  );

  return (
    <>
      {isPopover ? <EuiPopoverTitle>{filterUsersBar}</EuiPopoverTitle> : filterUsersBar}
      {isPopover ? <div className="euiFilterSelect__items">{usersList}</div> : usersList}
    </>
  );
};
