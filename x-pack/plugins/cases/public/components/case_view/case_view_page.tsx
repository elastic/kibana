/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingContent, EuiSpacer } from '@elastic/eui';

import { CaseStatuses, CaseAttributes, CaseConnector } from '../../../common/api';
import { Case, UpdateKey, UpdateByKey } from '../../../common/ui';
import { EditableTitle } from '../header_page/editable_title';
import { TagList } from '../tag_list';
import { UserActions } from '../user_actions';
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
import { useTimelineContext } from '../timeline_context/use_timeline_context';
import { getConnectorById } from '../utils';
import { useCasesContext } from '../cases_context/use_cases_context';
import { useCaseViewNavigation } from '../../common/navigation';
import { HeaderPage } from '../header_page';
import { useCasesTitleBreadcrumbs } from '../use_breadcrumbs';
import { useGetCaseMetrics } from '../../containers/use_get_case_metrics';
import { CaseViewMetrics } from './metrics';
import type { CaseViewPageProps, OnUpdateFields } from './types';
import { useCasesFeatures } from '../cases_context/use_cases_features';

const useOnUpdateField = ({
  caseData,
  caseId,
  handleUpdateField,
}: {
  caseData: Case;
  caseId: string;
  handleUpdateField: (newCase: Case, updateKey: UpdateKey) => void;
}) => {
  const { isLoading, updateKey: loadingKey, updateCaseProperty } = useUpdateCase({ caseId });

  const onUpdateField = useCallback(
    ({ key, value, onSuccess, onError }: OnUpdateFields) => {
      const callUpdate = (updateKey: UpdateKey, updateValue: UpdateByKey['updateValue']) =>
        updateCaseProperty({
          updateKey,
          updateValue,
          updateCase: (newCase) => handleUpdateField(newCase, updateKey),
          caseData,
          onSuccess,
          onError,
        });

      switch (key) {
        case 'title':
          const titleUpdate = getTypedPayload<string>(value);
          if (titleUpdate.length > 0) {
            callUpdate('title', titleUpdate);
          }
          break;
        case 'connector':
          const connector = getTypedPayload<CaseConnector>(value);
          if (connector != null) {
            callUpdate('connector', connector);
          }
          break;
        case 'description':
          const descriptionUpdate = getTypedPayload<string>(value);
          if (descriptionUpdate.length > 0) {
            callUpdate('description', descriptionUpdate);
          }
          break;
        case 'tags':
          const tagsUpdate = getTypedPayload<string[]>(value);
          callUpdate('tags', tagsUpdate);
          break;
        case 'status':
          const statusUpdate = getTypedPayload<CaseStatuses>(value);
          if (caseData.status !== value) {
            callUpdate('status', statusUpdate);
          }
          break;
        case 'settings':
          const settingsUpdate = getTypedPayload<CaseAttributes['settings']>(value);
          if (caseData.settings !== value) {
            callUpdate('settings', settingsUpdate);
          }
          break;
        default:
          return null;
      }
    },
    [updateCaseProperty, handleUpdateField, caseData]
  );
  return { onUpdateField, isLoading, loadingKey };
};

export const CaseViewPage = React.memo<CaseViewPageProps>(
  ({
    caseData,
    caseId,
    fetchCase,
    onComponentInitialized,
    actionsNavigation,
    ruleDetailsNavigation,
    showAlertDetails,
    updateCase,
    useFetchAlertData,
    refreshRef,
  }) => {
    const { userCanCrud } = useCasesContext();
    const { metricsFeatures } = useCasesFeatures();
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
    } = useGetCaseUserActions(caseId, caseData.connector.id);

    const refetchCaseUserActions = useCallback(() => {
      fetchCaseUserActions(caseId, caseData.connector.id);
    }, [caseId, fetchCaseUserActions, caseData]);

    const {
      metrics,
      isLoading: isLoadingMetrics,
      fetchCaseMetrics,
    } = useGetCaseMetrics(caseId, metricsFeatures);

    const handleRefresh = useCallback(() => {
      fetchCase();
      fetchCaseMetrics();
      refetchCaseUserActions();
    }, [fetchCase, refetchCaseUserActions, fetchCaseMetrics]);

    const handleUpdateCase = useCallback(
      (newCase: Case) => {
        updateCase(newCase);
        fetchCaseUserActions(caseId, newCase.connector.id);
        fetchCaseMetrics();
      },
      [updateCase, fetchCaseUserActions, caseId, fetchCaseMetrics]
    );

    const handleUpdateField = useCallback(
      (newCase: Case, updateKey: UpdateKey) => {
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

    // Set `refreshRef` if needed
    useEffect(() => {
      let isStale = false;
      if (refreshRef) {
        refreshRef.current = {
          refreshCase: async () => {
            // Do nothing if component (or instance of this render cycle) is stale or it is already loading
            if (isStale || isLoading || isLoadingMetrics || isLoadingUserActions) {
              return;
            }
            await Promise.all([fetchCase(true), fetchCaseMetrics(true), refetchCaseUserActions()]);
          },
        };
        return () => {
          isStale = true;
          refreshRef.current = null;
        };
      }
    }, [
      fetchCase,
      fetchCaseMetrics,
      refetchCaseUserActions,
      isLoadingUserActions,
      isLoadingMetrics,
      isLoading,
      refreshRef,
      updateCase,
    ]);

    const { loading: isLoadingConnectors, connectors } = useConnectors();

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

    const emailContent = useMemo(
      () => ({
        subject: i18n.EMAIL_SUBJECT(caseData.title),
        body: i18n.EMAIL_BODY(getCaseViewUrl({ detailName: caseId })),
      }),
      [caseData.title, getCaseViewUrl, caseId]
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
              isLoading={isLoading && loadingKey === 'title'}
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
            isLoading={isLoading && (loadingKey === 'status' || loadingKey === 'settings')}
            onRefresh={handleRefresh}
            onUpdateField={onUpdateField}
          />
        </HeaderPage>

        <WhitePageWrapper>
          <ContentWrapper>
            <EuiFlexGroup>
              <EuiFlexItem>
                {!initLoadingData && metricsFeatures.length > 0 ? (
                  <CaseViewMetrics
                    data-test-subj="case-view-metrics"
                    isLoading={isLoadingMetrics}
                    metrics={metrics}
                    features={metricsFeatures}
                  />
                ) : null}
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="m" />
            <EuiFlexGroup>
              <EuiFlexItem grow={6}>
                {initLoadingData && (
                  <EuiLoadingContent lines={8} data-test-subj="case-view-loading-content" />
                )}
                {!initLoadingData && (
                  <EuiFlexGroup direction="column" responsive={false}>
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
            </EuiFlexGroup>
          </ContentWrapper>
        </WhitePageWrapper>
        {timelineUi?.renderTimelineDetailsPanel ? timelineUi.renderTimelineDetailsPanel() : null}
      </>
    );
  }
);
CaseViewPage.displayName = 'CaseViewPage';
