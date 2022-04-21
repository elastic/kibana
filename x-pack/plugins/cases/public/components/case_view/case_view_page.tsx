/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingLogo,
  EuiSpacer,
  EuiTab,
  EuiTabs,
} from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CASE_VIEW_PAGE_TABS } from '../../../common/constants';
import { Case, UpdateKey } from '../../../common/ui';
import { useCaseViewNavigation, useUrlParams } from '../../common/navigation';
import { useGetCaseMetrics } from '../../containers/use_get_case_metrics';
import { useGetCaseUserActions } from '../../containers/use_get_case_user_actions';
import { useCasesContext } from '../cases_context/use_cases_context';
import { useCasesFeatures } from '../cases_context/use_cases_features';
import { CaseActionBar } from '../case_action_bar';
import { HeaderPage } from '../header_page';
import { EditableTitle } from '../header_page/editable_title';
import { useTimelineContext } from '../timeline_context/use_timeline_context';
import { useCasesTitleBreadcrumbs } from '../use_breadcrumbs';
import { ContentWrapper, WhitePageWrapper } from '../wrappers';
import { CaseViewActivity } from './components/case_view_activity';
import { CaseViewMetrics } from './metrics';
import { ACTIVITY_TAB, ALERTS_TAB } from './translations';
import type { CaseViewPageProps } from './types';
import { useOnUpdateField } from './use_on_update_field';

export const CaseViewPage = React.memo<CaseViewPageProps>(
  ({
    caseData,
    caseId,
    fetchCase,
    onComponentInitialized,
    updateCase,
    refreshRef,
    ruleDetailsNavigation,
    actionsNavigation,
    showAlertDetails,
    useFetchAlertData,
  }) => {
    const { userCanCrud } = useCasesContext();
    const { metricsFeatures } = useCasesFeatures();
    useCasesTitleBreadcrumbs(caseData.title);

    const { navigateToCaseView } = useCaseViewNavigation();
    const { urlParams } = useUrlParams();
    const activeTabId = urlParams.tabId || CASE_VIEW_PAGE_TABS.ACTIVITY;

    const [initLoadingData, setInitLoadingData] = useState(true);
    const init = useRef(true);
    const timelineUi = useTimelineContext()?.ui;

    const getCaseUserActions = useGetCaseUserActions(caseId, caseData.connector.id);

    const {
      fetchCaseUserActions,
      caseServices,
      isLoading: isLoadingUserActions,
    } = getCaseUserActions;

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

    const currentExternalIncident = useMemo(
      () =>
        caseServices != null && caseServices[caseData.connector.id] != null
          ? caseServices[caseData.connector.id]
          : null,
      [caseServices, caseData.connector]
    );

    const onSubmitTitle = useCallback(
      (newTitle) =>
        onUpdateField({
          key: 'title',
          value: newTitle,
        }),
      [onUpdateField]
    );

    useEffect(() => {
      if (initLoadingData && !isLoadingUserActions) {
        setInitLoadingData(false);
      }
    }, [initLoadingData, isLoadingUserActions]);

    // useEffect used for component's initialization
    useEffect(() => {
      if (init.current) {
        init.current = false;
        if (onComponentInitialized) {
          onComponentInitialized();
        }
      }
    }, [onComponentInitialized]);

    const tabs = useMemo(
      () => [
        {
          id: CASE_VIEW_PAGE_TABS.ACTIVITY,
          name: ACTIVITY_TAB,
          content: (
            <CaseViewActivity
              getCaseUserActions={getCaseUserActions}
              initLoadingData={initLoadingData}
              ruleDetailsNavigation={ruleDetailsNavigation}
              caseId={caseId}
              caseData={caseData}
              actionsNavigation={actionsNavigation}
              showAlertDetails={showAlertDetails}
              updateCase={updateCase}
              fetchCaseMetrics={fetchCaseMetrics}
              useFetchAlertData={useFetchAlertData}
            />
          ),
        },
        {
          id: CASE_VIEW_PAGE_TABS.ALERTS,
          name: ALERTS_TAB,
          content: (
            <EuiEmptyPrompt
              icon={<EuiLoadingLogo logo="logoKibana" size="xl" />}
              title={<h2>{'Alerts table placeholder'}</h2>}
            />
          ),
        },
      ],
      [
        actionsNavigation,
        caseData,
        caseId,
        fetchCaseMetrics,
        getCaseUserActions,
        initLoadingData,
        ruleDetailsNavigation,
        showAlertDetails,
        updateCase,
        useFetchAlertData,
      ]
    );
    const selectedTabContent = useMemo(() => {
      return tabs.find((obj) => obj.id === activeTabId)?.content;
    }, [activeTabId, tabs]);

    const renderTabs = useCallback(() => {
      return tabs.map((tab, index) => (
        <EuiTab
          data-test-subj={`case-view-tab-title-${tab.id}`}
          key={index}
          onClick={() => navigateToCaseView({ detailName: caseId, tabId: tab.id })}
          isSelected={tab.id === activeTabId}
        >
          {tab.name}
        </EuiTab>
      ));
    }, [activeTabId, caseId, navigateToCaseView, tabs]);

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
            <EuiTabs>{renderTabs()}</EuiTabs>
            <EuiSpacer size="l" />
            <EuiFlexGroup data-test-subj={`case-view-tab-content-${activeTabId}`}>
              {selectedTabContent}
            </EuiFlexGroup>
          </ContentWrapper>
        </WhitePageWrapper>
        {timelineUi?.renderTimelineDetailsPanel ? timelineUi.renderTimelineDetailsPanel() : null}
      </>
    );
  }
);
CaseViewPage.displayName = 'CaseViewPage';
