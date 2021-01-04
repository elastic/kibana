/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import { i18n } from '@kbn/i18n';

import {
  EuiButton,
  EuiConfirmModal,
  EuiOverlayMask,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiHorizontalRule,
} from '@elastic/eui';

import { AppLogic } from '../../../app_logic';
import { TruncatedContent } from '../../../../shared/truncate';
import { ContentSection } from '../../../components/shared/content_section';
import { ViewContentHeader } from '../../../components/shared/view_content_header';
import { Loading } from '../../../../shared/loading';
import { SourcesTable } from '../../../components/shared/sources_table';

import { GroupUsersTable } from './group_users_table';

import { GroupLogic, MAX_NAME_LENGTH } from '../group_logic';

export const EMPTY_SOURCES_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.groups.overview.emptySourcesDescription',
  {
    defaultMessage: 'No content sources are shared with this group.',
  }
);
const GROUP_USERS_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.groups.overview.groupUsersDescription',
  {
    defaultMessage: 'Members will be able to search over the group’s sources.',
  }
);
export const EMPTY_USERS_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.groups.overview.emptyUsersDescription',
  {
    defaultMessage: 'There are no users in this group.',
  }
);
const MANAGE_SOURCES_BUTTON_TEXT = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.groups.overview.manageSourcesButtonText',
  {
    defaultMessage: 'Manage shared content sources',
  }
);
const MANAGE_USERS_BUTTON_TEXT = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.groups.overview.manageUsersButtonText',
  {
    defaultMessage: 'Manage users',
  }
);
const NAME_SECTION_TITLE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.groups.overview.nameSectionTitle',
  {
    defaultMessage: 'Group name',
  }
);
const NAME_SECTION_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.groups.overview.nameSectionDescription',
  {
    defaultMessage: 'Customize the name of this group.',
  }
);
const SAVE_NAME_BUTTON_TEXT = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.groups.overview.saveNameButtonText',
  {
    defaultMessage: 'Save name',
  }
);
const REMOVE_SECTION_TITLE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.groups.overview.removeSectionTitle',
  {
    defaultMessage: 'Remove this group',
  }
);
const REMOVE_SECTION_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.groups.overview.removeSectionDescription',
  {
    defaultMessage: 'This action cannot be undone.',
  }
);
const REMOVE_BUTTON_TEXT = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.groups.overview.removeButtonText',
  {
    defaultMessage: 'Remove group',
  }
);
const CANCEL_REMOVE_BUTTON_TEXT = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.groups.overview.cancelRemoveButtonText',
  {
    defaultMessage: 'Cancel',
  }
);
const CONFIRM_TITLE_TEXT = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.groups.overview.confirmTitleText',
  {
    defaultMessage: 'Confirm',
  }
);

export const GroupOverview: React.FC = () => {
  const {
    deleteGroup,
    showSharedSourcesModal,
    showManageUsersModal,
    showConfirmDeleteModal,
    hideConfirmDeleteModal,
    updateGroupName,
    onGroupNameInputChange,
  } = useActions(GroupLogic);
  const {
    group: { name, contentSources, users, canDeleteGroup },
    groupNameInputValue,
    dataLoading,
    confirmDeleteModalVisible,
  } = useValues(GroupLogic);

  const { isFederatedAuth } = useValues(AppLogic);

  if (dataLoading) return <Loading />;

  const truncatedName = (
    <TruncatedContent tooltipType="title" content={name} length={MAX_NAME_LENGTH} />
  );

  const CONFIRM_REMOVE_BUTTON_TEXT = i18n.translate(
    'xpack.enterpriseSearch.workplaceSearch.groups.overview.confirmRemoveButtonText',
    {
      defaultMessage: 'Delete {name}',
      values: { name },
    }
  );
  const CONFIRM_REMOVE_DESCRIPTION = i18n.translate(
    'xpack.enterpriseSearch.workplaceSearch.groups.overview.confirmRemoveDescription',
    {
      defaultMessage:
        'Your group will be deleted from Workplace Search. Are you sure you want to remove {name}?',
      values: { name },
    }
  );
  const GROUP_SOURCES_DESCRIPTION = i18n.translate(
    'xpack.enterpriseSearch.workplaceSearch.groups.overview.groupSourcesDescription',
    {
      defaultMessage: 'Searchable by all users in the "{name}" group.',
      values: { name },
    }
  );

  const hasContentSources = contentSources.length > 0;
  const hasUsers = users.length > 0;

  const manageSourcesButton = (
    <EuiButton color="primary" onClick={showSharedSourcesModal}>
      {MANAGE_SOURCES_BUTTON_TEXT}
    </EuiButton>
  );
  const manageUsersButton = !isFederatedAuth && (
    <EuiButton color="primary" onClick={showManageUsersModal}>
      {MANAGE_USERS_BUTTON_TEXT}
    </EuiButton>
  );
  const sourcesTable = <SourcesTable sources={contentSources} />;

  const sourcesSection = (
    <ContentSection
      title="Group content sources"
      description={hasContentSources ? GROUP_SOURCES_DESCRIPTION : EMPTY_SOURCES_DESCRIPTION}
      action={manageSourcesButton}
      data-test-subj="GroupContentSourcesSection"
    >
      {hasContentSources && sourcesTable}
    </ContentSection>
  );

  const usersSection = !isFederatedAuth && (
    <ContentSection
      title="Group users"
      description={hasUsers ? GROUP_USERS_DESCRIPTION : EMPTY_USERS_DESCRIPTION}
      action={manageUsersButton}
      data-test-subj="GroupUsersSection"
    >
      {hasUsers && <GroupUsersTable />}
    </ContentSection>
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateGroupName();
  };

  const nameSection = (
    <ContentSection title={NAME_SECTION_TITLE} description={NAME_SECTION_DESCRIPTION}>
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
              <EuiButton disabled={!groupNameInputValue} onClick={updateGroupName}>
                {SAVE_NAME_BUTTON_TEXT}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFormRow>
      </form>
    </ContentSection>
  );

  const deleteSection = (
    <>
      <EuiSpacer size="xs" />
      <EuiHorizontalRule />
      <EuiSpacer size="xxl" />
      <ContentSection title={REMOVE_SECTION_TITLE} description={REMOVE_SECTION_DESCRIPTION}>
        {confirmDeleteModalVisible && (
          <EuiOverlayMask>
            <EuiConfirmModal
              onCancel={hideConfirmDeleteModal}
              onConfirm={deleteGroup}
              confirmButtonText={CONFIRM_REMOVE_BUTTON_TEXT}
              title={CONFIRM_TITLE_TEXT}
              cancelButtonText={CANCEL_REMOVE_BUTTON_TEXT}
              defaultFocusedButton="confirm"
            >
              {CONFIRM_REMOVE_DESCRIPTION}
            </EuiConfirmModal>
          </EuiOverlayMask>
        )}
        <EuiButton
          color="danger"
          data-test-subj="DeleteGroup"
          fill
          onClick={showConfirmDeleteModal}
        >
          {REMOVE_BUTTON_TEXT}
        </EuiButton>
      </ContentSection>
    </>
  );

  return (
    <>
      <ViewContentHeader title={truncatedName} />
      <EuiSpacer />
      {sourcesSection}
      {usersSection}
      {nameSection}
      {canDeleteGroup && deleteSection}
    </>
  );
};
