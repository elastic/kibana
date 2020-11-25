/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';
import { i18n } from '@kbn/i18n';

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiSpacer } from '@elastic/eui';
import { EuiButton as EuiLinkButton } from '../../../shared/react_router_helpers';

import { AppLogic } from '../../app_logic';

import { Loading } from '../../../shared/loading';
import { ViewContentHeader } from '../../components/shared/view_content_header';

import { getGroupPath, USERS_PATH } from '../../routes';

import { FlashMessages, FlashMessagesLogic } from '../../../shared/flash_messages';

import { GroupsLogic } from './groups_logic';

import { AddGroupModal } from './components/add_group_modal';
import { ClearFiltersLink } from './components/clear_filters_link';
import { GroupsTable } from './components/groups_table';
import { TableFilters } from './components/table_filters';

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

  const { isFederatedAuth } = useValues(AppLogic);

  const hasMessages = messages.length > 0;

  useEffect(() => {
    getSearchResults(true);
    return resetGroups;
  }, [filteredSources, filteredUsers, filterValue]);

  if (groupsDataLoading) {
    return <Loading />;
  }

  if (newGroup && hasMessages) {
    messages[0].description = (
      <EuiLinkButton
        to={getGroupPath(newGroup.id)}
        color="primary"
        data-test-subj="NewGroupManageButton"
      >
        {i18n.translate('xpack.enterpriseSearch.workplaceSearch.groups.newGroup.action', {
          defaultMessage: 'Manage Group',
        })}
      </EuiLinkButton>
    );
  }

  const clearFilters = hasFiltersSet && <ClearFiltersLink />;
  const inviteUsersButton = !isFederatedAuth ? (
    <EuiLinkButton to={USERS_PATH} data-test-subj="InviteUsersButton">
      {i18n.translate('xpack.enterpriseSearch.workplaceSearch.groups.inviteUsers.action', {
        defaultMessage: 'Invite users',
      })}
    </EuiLinkButton>
  ) : null;

  const headerAction = (
    <EuiFlexGroup responsive={false} gutterSize="m">
      <EuiFlexItem grow={false}>
        <EuiButton data-test-subj="AddGroupButton" fill={true} onClick={openNewGroupModal}>
          {i18n.translate('xpack.enterpriseSearch.workplaceSearch.groups.addGroupForm.action', {
            defaultMessage: 'Create a group',
          })}
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
    <>
      <FlashMessages />
      <ViewContentHeader
        title={i18n.translate('xpack.enterpriseSearch.workplaceSearch.groups.heading', {
          defaultMessage: 'Manage groups',
        })}
        description={i18n.translate('xpack.enterpriseSearch.workplaceSearch.groups.description', {
          defaultMessage:
            'Assign shared content sources and users to groups to create relevant search experiences for various internal teams.',
        })}
        action={headerAction}
      />
      <EuiSpacer size="m" />
      <TableFilters />
      <EuiSpacer />
      {numGroups > 0 && !groupListLoading ? <GroupsTable /> : noResults}
      {newGroupModalOpen && <AddGroupModal />}
    </>
  );
};
