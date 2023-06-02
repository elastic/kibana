/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable complexity */

import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiSpacer } from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { isEqual } from 'lodash';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { useGetCaseUsers } from '../../../containers/use_get_case_users';
import { useGetCaseConnectors } from '../../../containers/use_get_case_connectors';
import { useCasesFeatures } from '../../../common/use_cases_features';
import { useGetCurrentUserProfile } from '../../../containers/user_profiles/use_get_current_user_profile';
import { useGetSupportedActionConnectors } from '../../../containers/configure/use_get_supported_action_connectors';
import type { CaseSeverity } from '../../../../common/api';
import type { CaseUsers, UseFetchAlertData } from '../../../../common/ui/types';
import type { CaseUI, CaseStatuses } from '../../../../common';
import { EditConnector } from '../../edit_connector';
import type { CasesNavigation } from '../../links';
import { StatusActionButton } from '../../status/button';
import { EditTags } from './edit_tags';
import { UserActions } from '../../user_actions';
import { UserList } from './user_list';
import { useOnUpdateField } from '../use_on_update_field';
import { useCasesContext } from '../../cases_context/use_cases_context';
import * as i18n from '../translations';
import { SeveritySidebarSelector } from '../../severity/sidebar_selector';
import { useGetCaseUserActionsStats } from '../../../containers/use_get_case_user_actions_stats';
import { AssignUsers } from './assign_users';
import { UserActionsActivityBar } from '../../user_actions_activity_bar';
import type { Assignee } from '../../user_profiles/types';
import { convertToCaseUserWithProfileInfo } from '../../user_profiles/user_converter';
import type { UserActivityParams } from '../../user_actions_activity_bar/types';
import { CASE_VIEW_PAGE_TABS } from '../../../../common/types';
import { CaseViewTabs } from '../case_view_tabs';
import { Description } from '../../description';

const buildUserProfilesMap = (users?: CaseUsers): Map<string, UserProfileWithAvatar> => {
  const userProfiles = new Map();

  if (!users) {
    return userProfiles;
  }

  for (const user of [
    ...users.assignees,
    ...users.participants,
    users.reporter,
    ...users.unassignedUsers,
  ]) {
    /**
     * If the user has a valid profile UID and a valid username
     * then the backend successfully fetched the user profile
     * information from the security plugin. Checking only for the
     * profile UID is not enough as a user can use our API to add
     * an assignee with a non existing UID.
     */
    if (user.uid != null && user.user.username != null) {
      userProfiles.set(user.uid, {
        uid: user.uid,
        user: user.user,
        data: {
          avatar: user.avatar,
        },
      });
    }
  }

  return userProfiles;
};

export const CaseViewActivity = ({
  ruleDetailsNavigation,
  caseData,
  actionsNavigation,
  showAlertDetails,
  useFetchAlertData,
}: {
  ruleDetailsNavigation?: CasesNavigation<string | null | undefined, 'configurable'>;
  caseData: CaseUI;
  actionsNavigation?: CasesNavigation<string, 'configurable'>;
  showAlertDetails?: (alertId: string, index: string) => void;
  useFetchAlertData: UseFetchAlertData;
}) => {
  const [userActivityQueryParams, setUserActivityQueryParams] = useState<UserActivityParams>({
    type: 'all',
    sortOrder: 'asc',
    page: 1,
    perPage: 10,
  });

  const { permissions } = useCasesContext();

  const { caseAssignmentAuthorized, pushToServiceAuthorized } = useCasesFeatures();

  const { data: caseConnectors, isLoading: isLoadingCaseConnectors } = useGetCaseConnectors(
    caseData.id
  );

  const { data: userActionsStats, isLoading: isLoadingUserActionsStats } =
    useGetCaseUserActionsStats(caseData.id);

  const { data: caseUsers, isLoading: isLoadingCaseUsers } = useGetCaseUsers(caseData.id);

  const userProfiles = buildUserProfilesMap(caseUsers);

  const assignees = useMemo(
    () => caseData.assignees.map((assignee) => assignee.uid),
    [caseData.assignees]
  );

  const { data: currentUserProfile, isFetching: isLoadingCurrentUserProfile } =
    useGetCurrentUserProfile();

  const onShowAlertDetails = useCallback(
    (alertId: string, index: string) => {
      if (showAlertDetails) {
        showAlertDetails(alertId, index);
      }
    },
    [showAlertDetails]
  );

  const { onUpdateField, isLoading, loadingKey } = useOnUpdateField({
    caseData,
  });

  const isLoadingAssigneeData =
    (isLoading && loadingKey === 'assignees') || isLoadingCaseUsers || isLoadingCurrentUserProfile;

  const changeStatus = useCallback(
    (status: CaseStatuses) =>
      onUpdateField({
        key: 'status',
        value: status,
      }),
    [onUpdateField]
  );

  const onSubmitTags = useCallback(
    (newTags) => onUpdateField({ key: 'tags', value: newTags }),
    [onUpdateField]
  );

  const onUpdateSeverity = useCallback(
    (newSeverity: CaseSeverity) => onUpdateField({ key: 'severity', value: newSeverity }),
    [onUpdateField]
  );

  const onUpdateAssignees = useCallback(
    (newAssignees: Assignee[]) => {
      const newAssigneeUids = newAssignees.map((assignee) => ({ uid: assignee.uid }));
      if (!isEqual(newAssigneeUids.sort(), assignees.sort())) {
        onUpdateField({ key: 'assignees', value: newAssigneeUids });
      }
    },
    [assignees, onUpdateField]
  );

  const { isLoading: isLoadingAllAvailableConnectors, data: supportedActionConnectors } =
    useGetSupportedActionConnectors();

  const onSubmitConnector = useCallback(
    (connector) => {
      onUpdateField({
        key: 'connector',
        value: connector,
      });
    },
    [onUpdateField]
  );

  const handleUserActionsActivityChanged = useCallback(
    (params: UserActivityParams) => {
      setUserActivityQueryParams((oldParams) => ({
        ...oldParams,
        page: 1,
        type: params.type,
        sortOrder: params.sortOrder,
      }));
    },
    [setUserActivityQueryParams]
  );

  const showUserActions =
    !isLoadingUserActionsStats &&
    !isLoadingCaseConnectors &&
    !isLoadingCaseUsers &&
    caseConnectors &&
    caseUsers &&
    userActionsStats;

  const showConnectorSidebar =
    pushToServiceAuthorized && caseConnectors && supportedActionConnectors;

  const reporterAsArray =
    caseUsers?.reporter != null
      ? [caseUsers.reporter]
      : [convertToCaseUserWithProfileInfo(caseData.createdBy)];

  const isLoadingDescription = isLoading && loadingKey === 'description';

  return (
    <>
      <EuiFlexItem grow={6}>
        <CaseViewTabs caseData={caseData} activeTab={CASE_VIEW_PAGE_TABS.ACTIVITY} />
        <Description
          isLoadingDescription={isLoadingDescription}
          caseData={caseData}
          onUpdateField={onUpdateField}
        />
        <EuiSpacer size="l" />
        <EuiFlexItem grow={false}>
          <UserActionsActivityBar
            onUserActionsActivityChanged={handleUserActionsActivityChanged}
            params={userActivityQueryParams}
            userActionsStats={userActionsStats}
            isLoading={isLoadingUserActionsStats}
          />
        </EuiFlexItem>
        <EuiSpacer size="l" />
        {(isLoadingUserActionsStats || isLoadingCaseConnectors || isLoadingCaseUsers) && (
          <EuiLoadingSpinner data-test-subj="case-view-loading-content" size="l" />
        )}
        {showUserActions ? (
          <EuiFlexGroup direction="column" responsive={false} data-test-subj="case-view-activity">
            <EuiFlexItem>
              <UserActions
                userProfiles={userProfiles}
                currentUserProfile={currentUserProfile}
                getRuleDetailsHref={ruleDetailsNavigation?.href}
                onRuleDetailsClick={ruleDetailsNavigation?.onClick}
                caseConnectors={caseConnectors}
                data={caseData}
                actionsNavigation={actionsNavigation}
                onShowAlertDetails={onShowAlertDetails}
                onUpdateField={onUpdateField}
                statusActionButton={
                  permissions.update ? (
                    <StatusActionButton
                      status={caseData.status}
                      onStatusChanged={changeStatus}
                      isLoading={isLoading && loadingKey === 'status'}
                    />
                  ) : null
                }
                useFetchAlertData={useFetchAlertData}
                userActivityQueryParams={userActivityQueryParams}
                userActionsStats={userActionsStats}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : null}
      </EuiFlexItem>
      <EuiFlexItem grow={2}>
        <EuiFlexGroup direction="column" responsive={false} gutterSize="xl">
          {caseAssignmentAuthorized ? (
            <>
              <AssignUsers
                caseAssignees={caseData.assignees}
                currentUserProfile={currentUserProfile}
                onAssigneesChanged={onUpdateAssignees}
                isLoading={isLoadingAssigneeData}
                userProfiles={userProfiles ?? new Map()}
              />
            </>
          ) : null}
          <SeveritySidebarSelector
            isDisabled={!permissions.update}
            isLoading={isLoading}
            selectedSeverity={caseData.severity}
            onSeverityChange={onUpdateSeverity}
          />
          <UserList
            dataTestSubj="case-view-user-list-reporter"
            theCase={caseData}
            headline={i18n.REPORTER}
            users={reporterAsArray}
            userProfiles={userProfiles}
          />
          {caseUsers != null ? (
            <UserList
              dataTestSubj="case-view-user-list-participants"
              theCase={caseData}
              headline={i18n.PARTICIPANTS}
              loading={isLoadingCaseUsers}
              users={[...caseUsers.participants, ...caseUsers.assignees]}
              userProfiles={userProfiles}
            />
          ) : null}
          <EditTags
            tags={caseData.tags}
            onSubmit={onSubmitTags}
            isLoading={isLoading && loadingKey === 'tags'}
          />
          {showConnectorSidebar ? (
            <EditConnector
              caseData={caseData}
              caseConnectors={caseConnectors}
              supportedActionConnectors={supportedActionConnectors}
              isLoading={
                isLoadingAllAvailableConnectors || (isLoading && loadingKey === 'connector')
              }
              onSubmit={onSubmitConnector}
              key={caseData.connector.id}
            />
          ) : null}
        </EuiFlexGroup>
      </EuiFlexItem>
    </>
  );
};
CaseViewActivity.displayName = 'CaseViewActivity';
