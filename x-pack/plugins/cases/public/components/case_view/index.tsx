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
import { ContentWrapper, WhitePageWrapper } from '../wrappers';
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
import { getConnectorById } from '../utils';
import { DoesNotExist } from './does_not_exist';
import { useKibana } from '../../common/lib/kibana';
import { useCasesContext } from '../cases_context/use_cases_context';
import {
  generateCaseViewPath,
  useCaseViewNavigation,
  useCaseViewParams,
} from '../../common/navigation';
import { useCasesTitleBreadcrumbs } from '../use_breadcrumbs';

export interface CaseViewComponentProps {
  caseId: string;
  subCaseId?: string;
  onComponentInitialized?: () => void;
  actionsNavigation?: CasesNavigation<string, 'configurable'>;
  ruleDetailsNavigation?: CasesNavigation<string | null | undefined, 'configurable'>;
  showAlertDetails?: (alertId: string, index: string) => void;
  useFetchAlertData: (alertIds: string[]) => [boolean, Record<string, Ecs>];
  /**
   * A React `Ref` that Exposes data refresh callbacks.
   * **NOTE**: Do not hold on to the `.current` object, as it could become stale
   */
  refreshRef?: MutableRefObject<CaseViewRefreshPropInterface>;
  hideSyncAlerts?: boolean;
}

export interface CaseViewProps extends Omit<CaseViewComponentProps, 'caseId' | 'subCaseId'> {
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
    caseData,
    caseId,
    fetchCase,
    onComponentInitialized,
    actionsNavigation,
    ruleDetailsNavigation,
    showAlertDetails,
    subCaseId,
    updateCase,
    useFetchAlertData,
    refreshRef,
    hideSyncAlerts = false,
  }) => {
    const { userCanCrud } = useCasesContext();
    const { getCaseViewUrl } = useCaseViewNavigation();
    useCasesTitleBreadcrumbs(caseData.title);

    const [initLoadingData, setInitLoadingData] = useState(true);
    const init = useRef(true);
    const timelineUi = useTimelineContext()?.ui;

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

    const {
      loading: isLoadingConnectors,
      connectors,
      permissionsError,
    } = useConnectors({
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

    const onSubmitTags = useCallback(
      (newTags) => onUpdateField({ key: 'tags', value: newTags }),
      [onUpdateField]
    );

    const onSubmitTitle = useCallback(
      (newTitle) =>
        onUpdateField({
          key: 'title',
          value: newTitle,
        }),
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
        body: i18n.EMAIL_BODY(getCaseViewUrl({ detailName: caseId, subCaseId })),
      }),
      [caseData.title, getCaseViewUrl, caseId, subCaseId]
    );

    useEffect(() => {
      if (initLoadingData && !isLoadingUserActions) {
        setInitLoadingData(false);
      }
    }, [initLoadingData, isLoadingUserActions]);

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
        <HeaderPage
          showBackButton={true}
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
            caseData={caseData}
            currentExternalIncident={currentExternalIncident}
            userCanCrud={userCanCrud}
            disableAlerting={ruleDetailsNavigation == null || hideSyncAlerts}
            isLoading={isLoading && (updateKey === 'status' || updateKey === 'settings')}
            onRefresh={handleRefresh}
            onUpdateField={onUpdateField}
          />
        </HeaderPage>

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
        {timelineUi?.renderTimelineDetailsPanel ? timelineUi.renderTimelineDetailsPanel() : null}
      </>
    );
  }
);

export const CaseViewLoading = () => (
  <MyEuiFlexGroup gutterSize="none" justifyContent="center" alignItems="center">
    <EuiFlexItem grow={false}>
      <EuiLoadingSpinner data-test-subj="case-view-loading" size="xl" />
    </EuiFlexItem>
  </MyEuiFlexGroup>
);

export const CaseView = React.memo(
  ({
    onComponentInitialized,
    actionsNavigation,
    ruleDetailsNavigation,
    showAlertDetails,
    timelineIntegration,
    useFetchAlertData,
    refreshRef,
    hideSyncAlerts,
  }: CaseViewProps) => {
    const { spaces: spacesApi } = useKibana().services;
    const { detailName: caseId, subCaseId } = useCaseViewParams();
    const { basePath } = useCasesContext();
    const { data, resolveOutcome, resolveAliasId, isLoading, isError, fetchCase, updateCase } =
      useGetCase(caseId, subCaseId);

    useEffect(() => {
      if (spacesApi && resolveOutcome === 'aliasMatch' && resolveAliasId != null) {
        const newPath = `${basePath}${generateCaseViewPath({ detailName: resolveAliasId })}${
          window.location.search
        }${window.location.hash}`;
        spacesApi.ui.redirectLegacyUrl(newPath, i18n.CASE);
      }
    }, [resolveOutcome, resolveAliasId, basePath, spacesApi]);

    const getLegacyUrlConflictCallout = useCallback(() => {
      // This function returns a callout component *if* we have encountered a "legacy URL conflict" scenario
      if (data && spacesApi && resolveOutcome === 'conflict' && resolveAliasId != null) {
        // We have resolved to one object, but another object has a legacy URL alias associated with this ID/page. We should display a
        // callout with a warning for the user, and provide a way for them to navigate to the other object.
        const otherObjectPath = `${basePath}${generateCaseViewPath({
          detailName: resolveAliasId,
        })}${window.location.search}${window.location.hash}`;

        return spacesApi.ui.components.getLegacyUrlConflict({
          objectNoun: i18n.CASE,
          currentObjectId: data.id,
          otherObjectId: resolveAliasId,
          otherObjectPath,
        });
      }
      return null;
    }, [data, resolveAliasId, resolveOutcome, basePath, spacesApi]);

    return isError ? (
      <DoesNotExist caseId={caseId} />
    ) : isLoading ? (
      <CaseViewLoading />
    ) : (
      data && (
        <CasesTimelineIntegrationProvider timelineIntegration={timelineIntegration}>
          {getLegacyUrlConflictCallout()}
          <CaseComponent
            caseData={data}
            caseId={caseId}
            fetchCase={fetchCase}
            onComponentInitialized={onComponentInitialized}
            actionsNavigation={actionsNavigation}
            ruleDetailsNavigation={ruleDetailsNavigation}
            showAlertDetails={showAlertDetails}
            subCaseId={subCaseId}
            updateCase={updateCase}
            useFetchAlertData={useFetchAlertData}
            refreshRef={refreshRef}
            hideSyncAlerts={hideSyncAlerts}
          />
        </CasesTimelineIntegrationProvider>
      )
    );
  }
);

CaseComponent.displayName = 'CaseComponent';
CaseViewLoading.displayName = 'CaseViewLoading';
CaseView.displayName = 'CaseView';

// eslint-disable-next-line import/no-default-export
export { CaseView as default };
