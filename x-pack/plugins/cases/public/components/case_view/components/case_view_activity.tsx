/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable complexity */

import { EuiFlexGroup, EuiFlexItem, EuiLoadingContent, EuiSpacer } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { isEqual, uniq } from 'lodash';
import { useCasesFeatures } from '../../../common/use_cases_features';
import { useGetCurrentUserProfile } from '../../../containers/user_profiles/use_get_current_user_profile';
import { useBulkGetUserProfiles } from '../../../containers/user_profiles/use_bulk_get_user_profiles';
import { useGetConnectors } from '../../../containers/configure/use_connectors';
import type { CaseSeverity } from '../../../../common/api';
import { useCaseViewNavigation } from '../../../common/navigation';
import type { UseFetchAlertData } from '../../../../common/ui/types';
import type { Case, CaseStatuses } from '../../../../common';
import { EditConnector } from '../../edit_connector';
import type { CasesNavigation } from '../../links';
import { StatusActionButton } from '../../status/button';
import { EditTags } from './edit_tags';
import { UserActions } from '../../user_actions';
import { UserList } from './user_list';
import { useOnUpdateField } from '../use_on_update_field';
import { useCasesContext } from '../../cases_context/use_cases_context';
import * as i18n from '../translations';
import { getNoneConnector, normalizeActionConnector } from '../../configure_cases/utils';
import { getConnectorById } from '../../utils';
import { SeveritySidebarSelector } from '../../severity/sidebar_selector';
import { useGetCaseUserActions } from '../../../containers/use_get_case_user_actions';
import { AssignUsers } from './assign_users';
import type { Assignee } from '../../user_profiles/types';

export const CaseViewActivity = ({
  ruleDetailsNavigation,
  caseData,
  actionsNavigation,
  showAlertDetails,
  useFetchAlertData,
}: {
  ruleDetailsNavigation?: CasesNavigation<string | null | undefined, 'configurable'>;
  caseData: Case;
  actionsNavigation?: CasesNavigation<string, 'configurable'>;
  showAlertDetails?: (alertId: string, index: string) => void;
  useFetchAlertData: UseFetchAlertData;
}) => {
  const { permissions } = useCasesContext();
  const { getCaseViewUrl } = useCaseViewNavigation();
  const { caseAssignmentAuthorized, pushToServiceAuthorized } = useCasesFeatures();

  const { data: userActionsData, isLoading: isLoadingUserActions } = useGetCaseUserActions(
    caseData.id,
    caseData.connector.id
  );

  const assignees = useMemo(
    () => caseData.assignees.map((assignee) => assignee.uid),
    [caseData.assignees]
  );

  const userActionProfileUids = Array.from(userActionsData?.profileUids?.values() ?? []);
  const uidsToRetrieve = uniq([...userActionProfileUids, ...assignees]);

  const { data: userProfiles, isFetching: isLoadingUserProfiles } = useBulkGetUserProfiles({
    uids: uidsToRetrieve,
  });

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
    caseId: caseData.id,
    caseData,
  });

  const isLoadingAssigneeData =
    (isLoading && loadingKey === 'assignees') ||
    isLoadingUserProfiles ||
    isLoadingCurrentUserProfile;

  const changeStatus = useCallback(
    (status: CaseStatuses) =>
      onUpdateField({
        key: 'status',
        value: status,
      }),
    [onUpdateField]
  );

  const emailContent = useMemo(
    () => ({
      subject: i18n.EMAIL_SUBJECT(caseData.title),
      body: i18n.EMAIL_BODY(getCaseViewUrl({ detailName: caseData.id })),
    }),
    [caseData.title, getCaseViewUrl, caseData.id]
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

  const { isLoading: isLoadingConnectors, data: connectors = [] } = useGetConnectors();

  const [connectorName, isValidConnector] = useMemo(() => {
    const connector = connectors.find((c) => c.id === caseData.connector.id);
    return [connector?.name ?? '', !!connector];
  }, [connectors, caseData.connector]);

  const onSubmitConnector = useCallback(
    (connectorId, connectorFields, onError, onSuccess) => {
      const connector = getConnectorById(connectorId, connectors);
      const connectorToUpdate = connector
        ? normalizeActionConnector(connector)
        : getNoneConnector();

      onUpdateField({
        key: 'connector',
        value: { ...connectorToUpdate, fields: connectorFields },
        onSuccess,
        onError,
      });
    },
    [onUpdateField, connectors]
  );

  return (
    <>
      <EuiFlexItem grow={6}>
        {isLoadingUserActions && (
          <EuiLoadingContent lines={8} data-test-subj="case-view-loading-content" />
        )}
        {!isLoadingUserActions && userActionsData && userProfiles && (
          <EuiFlexGroup direction="column" responsive={false} data-test-subj="case-view-activity">
            <EuiFlexItem>
              <UserActions
                userProfiles={userProfiles}
                currentUserProfile={currentUserProfile}
                getRuleDetailsHref={ruleDetailsNavigation?.href}
                onRuleDetailsClick={ruleDetailsNavigation?.onClick}
                caseServices={userActionsData.caseServices}
                caseUserActions={userActionsData.caseUserActions}
                data={caseData}
                actionsNavigation={actionsNavigation}
                isLoadingDescription={isLoading && loadingKey === 'description'}
                isLoadingUserActions={isLoadingUserActions}
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
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </EuiFlexItem>
      <EuiFlexItem grow={2}>
        {caseAssignmentAuthorized ? (
          <>
            <AssignUsers
              caseAssignees={caseData.assignees}
              currentUserProfile={currentUserProfile}
              onAssigneesChanged={onUpdateAssignees}
              isLoading={isLoadingAssigneeData}
              userProfiles={userProfiles ?? new Map()}
            />
            <EuiSpacer size="m" />
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
          email={emailContent}
          headline={i18n.REPORTER}
          users={[caseData.createdBy]}
          userProfiles={userProfiles}
        />
        {userActionsData?.participants ? (
          <UserList
            dataTestSubj="case-view-user-list-participants"
            email={emailContent}
            headline={i18n.PARTICIPANTS}
            loading={isLoadingUserActions}
            users={userActionsData.participants}
            userProfiles={userProfiles}
          />
        ) : null}
        <EditTags
          tags={caseData.tags}
          onSubmit={onSubmitTags}
          isLoading={isLoading && loadingKey === 'tags'}
        />
        {pushToServiceAuthorized && userActionsData ? (
          <EditConnector
            caseData={caseData}
            caseServices={userActionsData.caseServices}
            connectorName={connectorName}
            connectors={connectors}
            hasDataToPush={userActionsData.hasDataToPush}
            isLoading={isLoadingConnectors || (isLoading && loadingKey === 'connector')}
            isValidConnector={isLoadingConnectors ? true : isValidConnector}
            onSubmit={onSubmitConnector}
            userActions={userActionsData.caseUserActions}
          />
        ) : null}
      </EuiFlexItem>
    </>
  );
};
CaseViewActivity.displayName = 'CaseViewActivity';
