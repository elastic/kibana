/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { FlashMessagesLogic } from '../../../shared/flash_messages';
import { EuiButtonTo } from '../../../shared/react_router_helpers';
import { WorkplaceSearchPageTemplate } from '../../components/layout';
import { NAV } from '../../constants';
import { getGroupPath, USERS_AND_ROLES_PATH } from '../../routes';

import { AddGroupModal } from './components/add_group_modal';
import { ClearFiltersLink } from './components/clear_filters_link';
import { GroupsTable } from './components/groups_table';
import { TableFilters } from './components/table_filters';
import { GroupsLogic } from './groups_logic';

export const Groups: React.FC = () => {
  const { messages } = useValues(FlashMessagesLogic);

  const { getSearchResults, openNewGroupModal, resetGroups } = useActions(GroupsLogic);
  const {
    groupsDataLoading,
    newGroupModalOpen,
    newGroup,
    groupListLoading,
    hasFiltersSet,
    groupsMeta: {
      page: { total_results: numGroups },
    },
    filteredSources,
    filteredUsers,
    filterValue,
  } = useValues(GroupsLogic);

  const hasMessages = messages.length > 0;

  useEffect(() => {
    getSearchResults(true);
    return resetGroups;
  }, [filteredSources, filteredUsers, filterValue]);

  if (newGroup && hasMessages) {
    messages[0].description = (
      <EuiButtonTo
        to={getGroupPath(newGroup.id)}
        color="success"
        data-test-subj="NewGroupManageButton"
      >
        {i18n.translate('xpack.enterpriseSearch.workplaceSearch.groups.newGroup.action', {
          defaultMessage: 'Manage Group',
        })}
      </EuiButtonTo>
    );
  }

  const clearFilters = hasFiltersSet && <ClearFiltersLink />;
  const inviteUsersButton = (
    <EuiButtonTo to={USERS_AND_ROLES_PATH} data-test-subj="InviteUsersButton">
      {i18n.translate('xpack.enterpriseSearch.workplaceSearch.groups.inviteUsers.action', {
        defaultMessage: 'Invite users',
      })}
    </EuiButtonTo>
  );
  const createGroupButton = (
    <EuiButton data-test-subj="AddGroupButton" fill onClick={openNewGroupModal}>
      {i18n.translate('xpack.enterpriseSearch.workplaceSearch.groups.addGroupForm.action', {
        defaultMessage: 'Create a group',
      })}
    </EuiButton>
  );
  const headerActions = [inviteUsersButton, createGroupButton];

  const noResults = (
    <EuiFlexGroup justifyContent="spaceAround">
      <EuiFlexItem grow={!groupListLoading}>
        {groupListLoading ? (
          <EuiLoadingSpinner size="xl" />
        ) : (
          <>
            {clearFilters}
            <p>
              {i18n.translate(
                'xpack.enterpriseSearch.workplaceSearch.groups.searchResults.notFoound',
                {
                  defaultMessage: 'No results found.',
                }
              )}
            </p>
          </>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  return (
    <WorkplaceSearchPageTemplate
      pageChrome={[NAV.GROUPS]}
      pageViewTelemetry="groups"
      pageHeader={{
        pageTitle: i18n.translate('xpack.enterpriseSearch.workplaceSearch.groups.heading', {
          defaultMessage: 'Manage groups',
        }),
        description: i18n.translate('xpack.enterpriseSearch.workplaceSearch.groups.description', {
          defaultMessage:
            'Assign organizational content sources and users to groups to create relevant search experiences for various internal teams.',
        }),
        rightSideItems: headerActions,
      }}
      isLoading={groupsDataLoading}
    >
      <TableFilters />
      <EuiSpacer />
      {numGroups > 0 && !groupListLoading ? <GroupsTable /> : noResults}
      {newGroupModalOpen && <AddGroupModal />}
    </WorkplaceSearchPageTemplate>
  );
};
