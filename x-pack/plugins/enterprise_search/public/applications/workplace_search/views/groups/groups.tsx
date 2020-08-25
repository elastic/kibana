/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';
import { Link } from 'react-router-dom';

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiSpacer } from '@elastic/eui';
import FlashMessages from 'shared/components/FlashMessages';

import { AppLogic, IAppValues } from 'workplace_search/App/AppLogic';
import {
  Loading,
  SidebarNavigation,
  ViewContentHeader,
  AppView,
} from 'workplace_search/components';
import { getGroupPath, USERS_PATH } from 'workplace_search/utils/routePaths';

import { useDebounce, useDidUpdateEffect } from 'shared/utils';

import { GroupsLogic, IGroupsActions, IGroupsValues } from './GroupsLogic';

import AddGroupModal from './components/AddGroupModal';
import ClearFiltersLink from './components/ClearFiltersLink';
import GroupsTable from './components/GroupsTable';
import TableFilters from './components/TableFilters';

export const Groups: React.FC = () => {
  const { getSearchResults, openNewGroupModal, resetGroups } = useActions(
    GroupsLogic
  ) as IGroupsActions;
  const {
    groupsDataLoading,
    newGroupModalOpen,
    newGroup,
    groupListLoading,
    flashMessages,
    hasFiltersSet,
    groupsMeta: {
      page: { current: activePage, total_results: numGroups },
    },
    filteredSources,
    filteredUsers,
    filterValue,
  } = useValues(GroupsLogic) as IGroupsValues;

  const {
    isFederatedAuth,
    canCreateInvitations,
    fpAccount: { isCurated },
  } = useValues(AppLogic) as IAppValues;

  const debouncedFilterValue = useDebounce(filterValue, 300);

  useEffect(() => {
    getSearchResults(true);
    return resetGroups;
  }, [debouncedFilterValue, filteredSources, filteredUsers]);
  // Because the initial search happens above, we want to skip the initial search and use the custom hook to do so.
  useDidUpdateEffect(() => {
    getSearchResults();
  }, [activePage]);

  if (groupsDataLoading) {
    return <Loading />;
  }

  const description = `Assign shared content sources ${
    !isFederatedAuth ? 'and users to groups ' : ''
  }to create relevant search experiences for various internal teams.`;
  const clearFilters = hasFiltersSet && <ClearFiltersLink />;
  const inviteUsersButton =
    !isFederatedAuth && (canCreateInvitations || isCurated) ? (
      <Link to={USERS_PATH}>
        <EuiButton data-test-subj="InviteUsersButton" color="primary" fill>
          Invite users
        </EuiButton>
      </Link>
    ) : null;

  const headerAction = (
    <EuiFlexGroup responsive={false} gutterSize="m">
      <EuiFlexItem grow={false}>
        <EuiButton
          data-test-subj="AddGroupButton"
          color="secondary"
          fill={true}
          onClick={openNewGroupModal}
        >
          Create a group
        </EuiButton>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>{inviteUsersButton}</EuiFlexItem>
    </EuiFlexGroup>
  );

  const noResults = (
    <EuiFlexGroup justifyContent="spaceAround">
      <EuiFlexItem grow={!groupListLoading}>
        {groupListLoading ? (
          <EuiLoadingSpinner size="xl" />
        ) : (
          <>
            {clearFilters}
            <p>No results found. </p>
          </>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  const flashMessagesEl = (
    <FlashMessages {...flashMessages}>
      {newGroup && (
        <Link to={getGroupPath(newGroup.id)}>
          <EuiButton color="primary">Manage Group</EuiButton>
        </Link>
      )}
    </FlashMessages>
  );

  const sidebar = <SidebarNavigation title="Manage groups" description={description} />;

  return (
    <AppView sidebar={sidebar}>
      <ViewContentHeader title="Organization groups" action={headerAction} />
      <EuiSpacer size="m" />
      {!!flashMessages && flashMessagesEl}
      <TableFilters />
      <EuiSpacer />
      {numGroups > 0 && !groupListLoading ? <GroupsTable /> : noResults}
      {newGroupModalOpen && <AddGroupModal />}
    </AppView>
  );
};
