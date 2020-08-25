/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { useActions, useValues } from 'kea';
import { withRouter } from 'react-router-dom';

import { EuiButton, EuiFieldText, EuiFlexGroup, EuiFlexItem, EuiFormRow } from '@elastic/eui';

import ConfirmModal from 'shared/components/ConfirmModal';
import TruncatedContent from 'shared/components/TruncatedContent';
import { AppLogic, IAppValues } from 'workplace_search/App/AppLogic';
import { Loading, ContentSection, SourcesTable } from 'workplace_search/components';
import { IRouter } from 'workplace_search/types';

import GroupUsersTable from './GroupUsersTable';

import { GroupLogic, IGroupActions, IGroupValues, MAX_NAME_LENGTH } from '../GroupLogic';

export const GroupOverview: React.FC<IRouter> = ({ history }) => {
  const {
    deleteGroup,
    showSharedSourcesModal,
    showManageUsersModal,
    showConfirmDeleteModal,
    hideConfirmDeleteModal,
    updateGroupName,
    onGroupNameInputChange,
  } = useActions(GroupLogic) as IGroupActions;
  const {
    group: { name, contentSources, users, canDeleteGroup },
    groupNameInputValue,
    dataLoading,
    confirmDeleteModalVisible,
  } = useValues(GroupLogic) as IGroupValues;

  const { isFederatedAuth } = useValues(AppLogic) as IAppValues;

  if (dataLoading) return <Loading />;

  const truncatedName = (
    <TruncatedContent tooltipType="title" content={name} length={MAX_NAME_LENGTH} />
  );
  const EMPTY_SOURCES_DESCRIPTION = 'No content sources are shared with this group.';
  const GROUP_SOURCES_DESCRIPTION = `Searchable by all users in the "${name}" group.`;
  const EMPTY_USERS_DESCRIPTION = 'There are no users in this group.';
  const hasContentSources = contentSources.length > 0;
  const hasUsers = users.length > 0;

  const manageSourcesButton = (
    <EuiButton color="primary" fill onClick={showSharedSourcesModal}>
      Manage shared content sources
    </EuiButton>
  );
  const manageUsersButton = !isFederatedAuth && (
    <EuiButton color="primary" fill onClick={showManageUsersModal}>
      Manage users
    </EuiButton>
  );
  const sourcesTable = <SourcesTable sources={contentSources} />;

  const sourcesSection = (
    <ContentSection
      title={<>{truncatedName} group shared content sources</>}
      description={hasContentSources ? GROUP_SOURCES_DESCRIPTION : EMPTY_SOURCES_DESCRIPTION}
    >
      {hasContentSources ? sourcesTable : manageSourcesButton}
    </ContentSection>
  );

  const usersSection = !isFederatedAuth && (
    <ContentSection
      title={<>{truncatedName} group users</>}
      description={hasUsers ? '' : EMPTY_USERS_DESCRIPTION}
    >
      {hasUsers ? <GroupUsersTable /> : manageUsersButton}
    </ContentSection>
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    updateGroupName();
  };

  const nameSection = (
    <ContentSection title="Group name" description="Customize the name of this group.">
      <form onSubmit={handleSubmit}>
        <EuiFormRow isInvalid={false}>
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <EuiFieldText
                isInvalid={false}
                value={groupNameInputValue}
                onChange={(e) => onGroupNameInputChange(e.target.value)}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                disabled={!groupNameInputValue}
                onClick={updateGroupName}
                color="secondary"
                fill
              >
                Save name
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFormRow>
      </form>
    </ContentSection>
  );

  const deleteSection = (
    <ContentSection title="Remove this group" description="This action cannot be undone.">
      {confirmDeleteModalVisible && (
        <ConfirmModal
          onCancel={hideConfirmDeleteModal}
          onConfirm={() => {
            deleteGroup(history);
          }}
          confirmButtonText={`Delete ${name}`}
        >
          Your group will be deleted from Workplace Search. <br />
          Are you sure you want to remove {name}?
        </ConfirmModal>
      )}
      <EuiButton color="danger" data-test-subj="DeleteGroup" fill onClick={showConfirmDeleteModal}>
        Remove {truncatedName}
      </EuiButton>
    </ContentSection>
  );

  return (
    <>
      {sourcesSection}
      {usersSection}
      {nameSection}
      {canDeleteGroup && deleteSection}
    </>
  );
};
