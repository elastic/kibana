/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLoadingContent } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { useConnectors } from '../../../containers/configure/use_connectors';
import { useCaseViewNavigation } from '../../../common/navigation';
import { UpdateKey, UseFetchAlertData } from '../../../../common/ui/types';
import { Case, CaseStatuses } from '../../../../common';
import { EditConnector } from '../../edit_connector';
import { CasesNavigation } from '../../links';
import { StatusActionButton } from '../../status/button';
import { TagList } from '../../tag_list';
import { UserActions } from '../../user_actions';
import { UserList } from '../../user_list';
import { useOnUpdateField } from '../use_on_update_field';
import { useCasesContext } from '../../cases_context/use_cases_context';
import * as i18n from '../translations';
import { getNoneConnector, normalizeActionConnector } from '../../configure_cases/utils';
import { getConnectorById } from '../../utils';
import { UseGetCaseUserActions } from '../../../containers/use_get_case_user_actions';

export const CaseViewActivity = ({
  initLoadingData,
  ruleDetailsNavigation,
  caseId,
  caseData,
  actionsNavigation,
  showAlertDetails,
  updateCase,
  fetchCaseMetrics,
  useFetchAlertData,
  getCaseUserActions,
}: {
  initLoadingData: boolean;
  ruleDetailsNavigation?: CasesNavigation<string | null | undefined, 'configurable'>;
  caseId: string;
  caseData: Case;
  actionsNavigation?: CasesNavigation<string, 'configurable'>;
  showAlertDetails?: (alertId: string, index: string) => void;
  updateCase: (newCase: Case) => void;
  fetchCaseMetrics: (silent?: boolean) => Promise<void>;
  useFetchAlertData: UseFetchAlertData;
  getCaseUserActions: UseGetCaseUserActions;
}) => {
  const { userCanCrud } = useCasesContext();
  const { getCaseViewUrl } = useCaseViewNavigation();

  const {
    caseUserActions,
    fetchCaseUserActions,
    caseServices,
    hasDataToPush,
    isLoading: isLoadingUserActions,
    participants,
  } = getCaseUserActions;

  const refetchCaseUserActions = useCallback(() => {
    fetchCaseUserActions(caseId, caseData.connector.id);
  }, [caseId, fetchCaseUserActions, caseData]);

  const onShowAlertDetails = useCallback(
    (alertId: string, index: string) => {
      if (showAlertDetails) {
        showAlertDetails(alertId, index);
      }
    },
    [showAlertDetails]
  );

  const handleUpdateField = useCallback(
    (newCase: Case, _updateKey: UpdateKey) => {
      updateCase({ ...newCase, comments: caseData.comments });
      fetchCaseUserActions(caseId, newCase.connector.id);
      fetchCaseMetrics();
    },
    [updateCase, caseData, fetchCaseUserActions, caseId, fetchCaseMetrics]
  );

  const { onUpdateField, isLoading, loadingKey } = useOnUpdateField({
    caseId,
    caseData,
    handleUpdateField,
  });

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
      body: i18n.EMAIL_BODY(getCaseViewUrl({ detailName: caseId })),
    }),
    [caseData.title, getCaseViewUrl, caseId]
  );

  const onSubmitTags = useCallback(
    (newTags) => onUpdateField({ key: 'tags', value: newTags }),
    [onUpdateField]
  );
  const { loading: isLoadingConnectors, connectors } = useConnectors();

  const [connectorName, isValidConnector] = useMemo(() => {
    const connector = connectors.find((c) => c.id === caseData.connector.id);
    return [connector?.name ?? '', !!connector];
  }, [connectors, caseData.connector]);

  const handleUpdateCase = useCallback(
    (newCase: Case) => {
      updateCase(newCase);
      fetchCaseUserActions(caseId, newCase.connector.id);
      fetchCaseMetrics();
    },
    [updateCase, fetchCaseUserActions, caseId, fetchCaseMetrics]
  );

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
        {initLoadingData && (
          <EuiLoadingContent lines={8} data-test-subj="case-view-loading-content" />
        )}
        {!initLoadingData && (
          <EuiFlexGroup direction="column" responsive={false} data-test-subj="case-view-activity">
            <EuiFlexItem>
              <UserActions
                getRuleDetailsHref={ruleDetailsNavigation?.href}
                onRuleDetailsClick={ruleDetailsNavigation?.onClick}
                caseServices={caseServices}
                caseUserActions={caseUserActions}
                data={caseData}
                actionsNavigation={actionsNavigation}
                fetchUserActions={refetchCaseUserActions}
                isLoadingDescription={isLoading && loadingKey === 'description'}
                isLoadingUserActions={isLoadingUserActions}
                onShowAlertDetails={onShowAlertDetails}
                onUpdateField={onUpdateField}
                statusActionButton={
                  userCanCrud ? (
                    <StatusActionButton
                      status={caseData.status}
                      onStatusChanged={changeStatus}
                      isLoading={isLoading && loadingKey === 'status'}
                    />
                  ) : null
                }
                updateCase={updateCase}
                useFetchAlertData={useFetchAlertData}
                userCanCrud={userCanCrud}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </EuiFlexItem>
      <EuiFlexItem grow={2}>
        <UserList
          data-test-subj="case-view-user-list-reporter"
          email={emailContent}
          headline={i18n.REPORTER}
          users={[caseData.createdBy]}
        />
        <UserList
          data-test-subj="case-view-user-list-participants"
          email={emailContent}
          headline={i18n.PARTICIPANTS}
          loading={isLoadingUserActions}
          users={participants}
        />
        <TagList
          data-test-subj="case-view-tag-list"
          userCanCrud={userCanCrud}
          tags={caseData.tags}
          onSubmit={onSubmitTags}
          isLoading={isLoading && loadingKey === 'tags'}
        />
        <EditConnector
          caseData={caseData}
          caseServices={caseServices}
          connectorName={connectorName}
          connectors={connectors}
          hasDataToPush={hasDataToPush && userCanCrud}
          isLoading={isLoadingConnectors || (isLoading && loadingKey === 'connector')}
          isValidConnector={isLoadingConnectors ? true : isValidConnector}
          onSubmit={onSubmitConnector}
          updateCase={handleUpdateCase}
          userActions={caseUserActions}
          userCanCrud={userCanCrud}
        />
      </EuiFlexItem>
    </>
  );
};
CaseViewActivity.displayName = 'CaseViewActivity';
