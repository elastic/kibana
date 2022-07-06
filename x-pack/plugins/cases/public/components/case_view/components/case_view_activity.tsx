/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLoadingContent } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { useGetConnectors } from '../../../containers/configure/use_connectors';
import { CaseSeverity } from '../../../../common/api';
import { useCaseViewNavigation } from '../../../common/navigation';
import { UseFetchAlertData } from '../../../../common/ui/types';
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
import { SeveritySidebarSelector } from '../../severity/sidebar_selector';
import { useGetCaseUserActions } from '../../../containers/use_get_case_user_actions';

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

  const { data: userActionsData, isLoading: isLoadingUserActions } = useGetCaseUserActions(
    caseData.id,
    caseData.connector.id
  );

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
        {!isLoadingUserActions && userActionsData && (
          <EuiFlexGroup direction="column" responsive={false} data-test-subj="case-view-activity">
            <EuiFlexItem>
              <UserActions
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
                  permissions.all ? (
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
        <SeveritySidebarSelector
          isDisabled={!permissions.all}
          isLoading={isLoading}
          selectedSeverity={caseData.severity}
          onSeverityChange={onUpdateSeverity}
        />
        <UserList
          data-test-subj="case-view-user-list-reporter"
          email={emailContent}
          headline={i18n.REPORTER}
          users={[caseData.createdBy]}
        />
        {userActionsData?.participants ? (
          <UserList
            data-test-subj="case-view-user-list-participants"
            email={emailContent}
            headline={i18n.PARTICIPANTS}
            loading={isLoadingUserActions}
            users={userActionsData.participants}
          />
        ) : null}
        <TagList
          tags={caseData.tags}
          onSubmit={onSubmitTags}
          isLoading={isLoading && loadingKey === 'tags'}
        />
        {userActionsData ? (
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
