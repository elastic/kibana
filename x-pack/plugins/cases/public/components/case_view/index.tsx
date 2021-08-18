/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState, useRef, MutableRefObject } from 'react';
import styled from 'styled-components';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingContent, EuiLoadingSpinner } from '@elastic/eui';

import {
  CaseStatuses,
  CaseAttributes,
  CaseType,
  Case,
  CaseConnector,
  Ecs,
  CaseViewRefreshPropInterface,
} from '../../../common';
import { HeaderPage } from '../header_page';
import { EditableTitle } from '../header_page/editable_title';
import { TagList } from '../tag_list';
import { UseGetCase, useGetCase } from '../../containers/use_get_case';
import { UserActionTree } from '../user_action_tree';
import { UserList } from '../user_list';
import { useUpdateCase } from '../../containers/use_update_case';
import { getTypedPayload } from '../../containers/utils';
import { ContentWrapper, WhitePageWrapper, HeaderWrapper } from '../wrappers';
import { CaseActionBar } from '../case_action_bar';
import { useGetCaseUserActions } from '../../containers/use_get_case_user_actions';
import { EditConnector } from '../edit_connector';
import { useConnectors } from '../../containers/configure/use_connectors';
import { normalizeActionConnector, getNoneConnector } from '../configure_cases/utils';
import { StatusActionButton } from '../status/button';
import * as i18n from './translations';
import { CasesTimelineIntegration, CasesTimelineIntegrationProvider } from '../timeline_context';
import { useTimelineContext } from '../timeline_context/use_timeline_context';
import { CasesNavigation } from '../links';
import { OwnerProvider } from '../owner_context';
import { getConnectorById } from '../utils';
import { DoesNotExist } from './does_not_exist';

export interface CaseViewComponentProps {
  allCasesNavigation: CasesNavigation;
  caseDetailsNavigation: CasesNavigation;
  caseId: string;
  configureCasesNavigation: CasesNavigation;
  getCaseDetailHrefWithCommentId: (commentId: string) => string;
  onComponentInitialized?: () => void;
  actionsNavigation?: CasesNavigation<string, 'configurable'>;
  ruleDetailsNavigation?: CasesNavigation<string | null | undefined, 'configurable'>;
  showAlertDetails?: (alertId: string, index: string) => void;
  subCaseId?: string;
  useFetchAlertData: (alertIds: string[]) => [boolean, Record<string, Ecs>];
  userCanCrud: boolean;
  /**
   * A React `Ref` that Exposes data refresh callbacks.
   * **NOTE**: Do not hold on to the `.current` object, as it could become stale
   */
  refreshRef?: MutableRefObject<CaseViewRefreshPropInterface>;
}

export interface CaseViewProps extends CaseViewComponentProps {
  onCaseDataSuccess?: (data: Case) => void;
  timelineIntegration?: CasesTimelineIntegration;
}

export interface OnUpdateFields {
  key: keyof Case;
  value: Case[keyof Case];
  onSuccess?: () => void;
  onError?: () => void;
}

const MyEuiFlexGroup = styled(EuiFlexGroup)`
  height: 100%;
`;

export interface CaseComponentProps extends CaseViewComponentProps {
  fetchCase: UseGetCase['fetchCase'];
  caseData: Case;
  updateCase: (newCase: Case) => void;
}

export const CaseComponent = React.memo<CaseComponentProps>(
  ({
    allCasesNavigation,
    caseData,
    caseDetailsNavigation,
    caseId,
    configureCasesNavigation,
    getCaseDetailHrefWithCommentId,
    fetchCase,
    onComponentInitialized,
    actionsNavigation,
    ruleDetailsNavigation,
    showAlertDetails,
    subCaseId,
    updateCase,
    useFetchAlertData,
    userCanCrud,
    refreshRef,
  }) => {
    const [initLoadingData, setInitLoadingData] = useState(true);
    const init = useRef(true);
    const timelineUi = useTimelineContext()?.ui;
    const alertConsumers = useTimelineContext()?.alertConsumers;

    const {
      caseUserActions,
      fetchCaseUserActions,
      caseServices,
      hasDataToPush,
      isLoading: isLoadingUserActions,
      participants,
    } = useGetCaseUserActions(caseId, caseData.connector.id, subCaseId);

    const { isLoading, updateKey, updateCaseProperty } = useUpdateCase({
      caseId,
      subCaseId,
    });

    // Set `refreshRef` if needed
    useEffect(() => {
      let isStale = false;

      if (refreshRef) {
        refreshRef.current = {
          refreshCase: async () => {
            // Do nothing if component (or instance of this render cycle) is stale
            if (isStale) {
              return;
            }

            await fetchCase();
          },
          refreshUserActionsAndComments: async () => {
            // Do nothing if component (or instance of this render cycle) is stale
            // -- OR --
            // it is already loading
            if (isStale || isLoadingUserActions) {
              return;
            }

            await Promise.all([
              fetchCase(true),
              fetchCaseUserActions(caseId, caseData.connector.id, subCaseId),
            ]);
          },
        };

        return () => {
          isStale = true;
          refreshRef.current = null;
        };
      }
    }, [
      caseData.connector.id,
      caseId,
      fetchCase,
      fetchCaseUserActions,
      isLoadingUserActions,
      refreshRef,
      subCaseId,
      updateCase,
    ]);

    // Update Fields
    const onUpdateField = useCallback(
      ({ key, value, onSuccess, onError }: OnUpdateFields) => {
        const handleUpdateNewCase = (newCase: Case) =>
          updateCase({ ...newCase, comments: caseData.comments });
        switch (key) {
          case 'title':
            const titleUpdate = getTypedPayload<string>(value);
            if (titleUpdate.length > 0) {
              updateCaseProperty({
                fetchCaseUserActions,
                updateKey: 'title',
                updateValue: titleUpdate,
                updateCase: handleUpdateNewCase,
                caseData,
                onSuccess,
                onError,
              });
            }
            break;
          case 'connector':
            const connector = getTypedPayload<CaseConnector>(value);
            if (connector != null) {
              updateCaseProperty({
                fetchCaseUserActions,
                updateKey: 'connector',
                updateValue: connector,
                updateCase: handleUpdateNewCase,
                caseData,
                onSuccess,
                onError,
              });
            }
            break;
          case 'description':
            const descriptionUpdate = getTypedPayload<string>(value);
            if (descriptionUpdate.length > 0) {
              updateCaseProperty({
                fetchCaseUserActions,
                updateKey: 'description',
                updateValue: descriptionUpdate,
                updateCase: handleUpdateNewCase,
                caseData,
                onSuccess,
                onError,
              });
            }
            break;
          case 'tags':
            const tagsUpdate = getTypedPayload<string[]>(value);
            updateCaseProperty({
              fetchCaseUserActions,
              updateKey: 'tags',
              updateValue: tagsUpdate,
              updateCase: handleUpdateNewCase,
              caseData,
              onSuccess,
              onError,
            });
            break;
          case 'status':
            const statusUpdate = getTypedPayload<CaseStatuses>(value);
            if (caseData.status !== value) {
              updateCaseProperty({
                fetchCaseUserActions,
                updateKey: 'status',
                updateValue: statusUpdate,
                updateCase: handleUpdateNewCase,
                caseData,
                onSuccess,
                onError,
              });
            }
            break;
          case 'settings':
            const settingsUpdate = getTypedPayload<CaseAttributes['settings']>(value);
            if (caseData.settings !== value) {
              updateCaseProperty({
                fetchCaseUserActions,
                updateKey: 'settings',
                updateValue: settingsUpdate,
                updateCase: handleUpdateNewCase,
                caseData,
                onSuccess,
                onError,
              });
            }
            break;
          default:
            return null;
        }
      },
      [fetchCaseUserActions, updateCaseProperty, updateCase, caseData]
    );

    const handleUpdateCase = useCallback(
      (newCase: Case) => {
        updateCase(newCase);
        fetchCaseUserActions(caseId, newCase.connector.id, subCaseId);
      },
      [updateCase, fetchCaseUserActions, caseId, subCaseId]
    );

    const { loading: isLoadingConnectors, connectors, permissionsError } = useConnectors({
      toastPermissionsErrors: false,
    });

    const [connectorName, isValidConnector] = useMemo(() => {
      const connector = connectors.find((c) => c.id === caseData.connector.id);
      return [connector?.name ?? '', !!connector];
    }, [connectors, caseData.connector]);

    const currentExternalIncident = useMemo(
      () =>
        caseServices != null && caseServices[caseData.connector.id] != null
          ? caseServices[caseData.connector.id]
          : null,
      [caseServices, caseData.connector]
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

    const onSubmitTags = useCallback((newTags) => onUpdateField({ key: 'tags', value: newTags }), [
      onUpdateField,
    ]);

    const onSubmitTitle = useCallback(
      (newTitle) => onUpdateField({ key: 'title', value: newTitle }),
      [onUpdateField]
    );

    const changeStatus = useCallback(
      (status: CaseStatuses) =>
        onUpdateField({
          key: 'status',
          value: status,
        }),
      [onUpdateField]
    );

    const handleRefresh = useCallback(() => {
      fetchCaseUserActions(caseId, caseData.connector.id, subCaseId);
      fetchCase();
    }, [caseData.connector.id, caseId, fetchCase, fetchCaseUserActions, subCaseId]);

    const emailContent = useMemo(
      () => ({
        subject: i18n.EMAIL_SUBJECT(caseData.title),
        body: i18n.EMAIL_BODY(caseDetailsNavigation.href),
      }),
      [caseDetailsNavigation.href, caseData.title]
    );

    useEffect(() => {
      if (initLoadingData && !isLoadingUserActions) {
        setInitLoadingData(false);
      }
    }, [initLoadingData, isLoadingUserActions]);

    const backOptions = useMemo(
      () => ({
        href: allCasesNavigation.href,
        text: i18n.BACK_TO_ALL,
        dataTestSubj: 'backToCases',
        onClick: allCasesNavigation.onClick,
      }),
      [allCasesNavigation]
    );

    const onShowAlertDetails = useCallback(
      (alertId: string, index: string) => {
        if (showAlertDetails) {
          showAlertDetails(alertId, index);
        }
      },
      [showAlertDetails]
    );

    // useEffect used for component's initialization
    useEffect(() => {
      if (init.current) {
        init.current = false;
        if (onComponentInitialized) {
          onComponentInitialized();
        }
      }
    }, [onComponentInitialized]);

    return (
      <>
        <HeaderWrapper>
          <HeaderPage
            backOptions={backOptions}
            data-test-subj="case-view-title"
            titleNode={
              <EditableTitle
                userCanCrud={userCanCrud}
                isLoading={isLoading && updateKey === 'title'}
                title={caseData.title}
                onSubmit={onSubmitTitle}
              />
            }
            title={caseData.title}
          >
            <CaseActionBar
              allCasesNavigation={allCasesNavigation}
              caseData={caseData}
              currentExternalIncident={currentExternalIncident}
              userCanCrud={userCanCrud}
              disableAlerting={ruleDetailsNavigation == null}
              isLoading={isLoading && (updateKey === 'status' || updateKey === 'settings')}
              onRefresh={handleRefresh}
              onUpdateField={onUpdateField}
            />
          </HeaderPage>
        </HeaderWrapper>
        <WhitePageWrapper>
          <ContentWrapper>
            <EuiFlexGroup>
              <EuiFlexItem grow={6}>
                {initLoadingData && (
                  <EuiLoadingContent lines={8} data-test-subj="case-view-loading-content" />
                )}
                {!initLoadingData && (
                  <>
                    <UserActionTree
                      getCaseDetailHrefWithCommentId={getCaseDetailHrefWithCommentId}
                      getRuleDetailsHref={ruleDetailsNavigation?.href}
                      onRuleDetailsClick={ruleDetailsNavigation?.onClick}
                      caseServices={caseServices}
                      caseUserActions={caseUserActions}
                      connectors={connectors}
                      data={caseData}
                      actionsNavigation={actionsNavigation}
                      fetchUserActions={fetchCaseUserActions.bind(
                        null,
                        caseId,
                        caseData.connector.id,
                        subCaseId
                      )}
                      isLoadingDescription={isLoading && updateKey === 'description'}
                      isLoadingUserActions={isLoadingUserActions}
                      onShowAlertDetails={onShowAlertDetails}
                      onUpdateField={onUpdateField}
                      renderInvestigateInTimelineActionComponent={
                        timelineUi?.renderInvestigateInTimelineActionComponent
                      }
                      statusActionButton={
                        caseData.type !== CaseType.collection && userCanCrud ? (
                          <StatusActionButton
                            status={caseData.status}
                            onStatusChanged={changeStatus}
                            isLoading={isLoading && updateKey === 'status'}
                          />
                        ) : null
                      }
                      updateCase={updateCase}
                      useFetchAlertData={useFetchAlertData}
                      userCanCrud={userCanCrud}
                    />
                  </>
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
                  isLoading={isLoading && updateKey === 'tags'}
                />
                <EditConnector
                  caseData={caseData}
                  caseServices={caseServices}
                  configureCasesNavigation={configureCasesNavigation}
                  connectorName={connectorName}
                  connectors={connectors}
                  hasDataToPush={hasDataToPush && userCanCrud}
                  hideConnectorServiceNowSir={
                    subCaseId != null || caseData.type === CaseType.collection
                  }
                  isLoading={isLoadingConnectors || (isLoading && updateKey === 'connector')}
                  isValidConnector={isLoadingConnectors ? true : isValidConnector}
                  onSubmit={onSubmitConnector}
                  permissionsError={permissionsError}
                  updateCase={handleUpdateCase}
                  userActions={caseUserActions}
                  userCanCrud={userCanCrud}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </ContentWrapper>
        </WhitePageWrapper>
        {timelineUi?.renderTimelineDetailsPanel
          ? timelineUi.renderTimelineDetailsPanel({ alertConsumers })
          : null}
      </>
    );
  }
);

export const CaseView = React.memo(
  ({
    allCasesNavigation,
    caseDetailsNavigation,
    caseId,
    configureCasesNavigation,
    getCaseDetailHrefWithCommentId,
    onCaseDataSuccess,
    onComponentInitialized,
    actionsNavigation,
    ruleDetailsNavigation,
    showAlertDetails,
    subCaseId,
    timelineIntegration,
    useFetchAlertData,
    userCanCrud,
    refreshRef,
  }: CaseViewProps) => {
    const { data, isLoading, isError, fetchCase, updateCase } = useGetCase(caseId, subCaseId);
    if (isError) {
      return <DoesNotExist allCasesNavigation={allCasesNavigation} caseId={caseId} />;
    }
    if (isLoading) {
      return (
        <MyEuiFlexGroup gutterSize="none" justifyContent="center" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner data-test-subj="case-view-loading" size="xl" />
          </EuiFlexItem>
        </MyEuiFlexGroup>
      );
    }
    if (onCaseDataSuccess && data) {
      onCaseDataSuccess(data);
    }

    return (
      data && (
        <CasesTimelineIntegrationProvider timelineIntegration={timelineIntegration}>
          <OwnerProvider owner={[data.owner]}>
            <CaseComponent
              allCasesNavigation={allCasesNavigation}
              caseData={data}
              caseDetailsNavigation={caseDetailsNavigation}
              caseId={caseId}
              configureCasesNavigation={configureCasesNavigation}
              getCaseDetailHrefWithCommentId={getCaseDetailHrefWithCommentId}
              fetchCase={fetchCase}
              onComponentInitialized={onComponentInitialized}
              actionsNavigation={actionsNavigation}
              ruleDetailsNavigation={ruleDetailsNavigation}
              showAlertDetails={showAlertDetails}
              subCaseId={subCaseId}
              updateCase={updateCase}
              useFetchAlertData={useFetchAlertData}
              userCanCrud={userCanCrud}
              refreshRef={refreshRef}
            />
          </OwnerProvider>
        </CasesTimelineIntegrationProvider>
      )
    );
  }
);

CaseComponent.displayName = 'CaseComponent';
CaseView.displayName = 'CaseView';

// eslint-disable-next-line import/no-default-export
export { CaseView as default };
