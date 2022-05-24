/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBetaBadge, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTab, EuiTabs } from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import styled from 'styled-components';
import { Case, UpdateKey } from '../../../common/ui';
import { useCaseViewNavigation, useUrlParams } from '../../common/navigation';
import { useGetCaseMetrics } from '../../containers/use_get_case_metrics';
import { useGetCaseUserActions } from '../../containers/use_get_case_user_actions';
import { useCasesContext } from '../cases_context/use_cases_context';
import { useCasesFeatures } from '../cases_context/use_cases_features';
import { CaseActionBar } from '../case_action_bar';
import { HeaderPage } from '../header_page';
import { EditableTitle } from '../header_page/editable_title';
import { EXPERIMENTAL_DESC, EXPERIMENTAL_LABEL } from '../header_page/translations';
import { useTimelineContext } from '../timeline_context/use_timeline_context';
import { useCasesTitleBreadcrumbs } from '../use_breadcrumbs';
import { WhitePageWrapperNoBorder } from '../wrappers';
import { CaseViewActivity } from './components/case_view_activity';
import { CaseViewAlerts } from './components/case_view_alerts';
import { CaseViewMetrics } from './metrics';
import { ACTIVITY_TAB, ALERTS_TAB } from './translations';
import { CaseViewPageProps, CASE_VIEW_PAGE_TABS } from './types';
import { useOnUpdateField } from './use_on_update_field';

const ExperimentalBadge = styled(EuiBetaBadge)`
  margin-left: 5px;
`;

export const CaseViewPage = React.memo<CaseViewPageProps>(
  ({
    caseData,
    caseId,
    fetchCase,
    onComponentInitialized,
    refreshRef,
    ruleDetailsNavigation,
    actionsNavigation,
    showAlertDetails,
    useFetchAlertData,
  }) => {
    const { userCanCrud, features } = useCasesContext();
    const { metricsFeatures } = useCasesFeatures();
    useCasesTitleBreadcrumbs(caseData.title);

    const { navigateToCaseView } = useCaseViewNavigation();
    const { urlParams } = useUrlParams();
    const activeTabId = useMemo(() => {
      if (urlParams.tabId && Object.values(CASE_VIEW_PAGE_TABS).includes(urlParams.tabId)) {
        return urlParams.tabId;
      }
      return CASE_VIEW_PAGE_TABS.ACTIVITY;
    }, [urlParams.tabId]);

    const init = useRef(true);
    const timelineUi = useTimelineContext()?.ui;

    const {
      data,
      refetch: fetchCaseUserActions,
      isFetching: isLoadingUserActions,
    } = useGetCaseUserActions(caseData.id, caseData.connector.id);

    const {
      metrics,
      isLoading: isLoadingMetrics,
      fetchCaseMetrics,
    } = useGetCaseMetrics(caseId, metricsFeatures);

    const handleRefresh = useCallback(() => {
      fetchCase();
      fetchCaseMetrics();
      fetchCaseUserActions();
    }, [fetchCase, fetchCaseMetrics, fetchCaseUserActions]);

    const handleUpdateField = useCallback(
      (_newCase: Case, _updateKey: UpdateKey) => {
        fetchCase();
        fetchCaseUserActions();
        fetchCaseMetrics();
      },
      [fetchCase, fetchCaseUserActions, fetchCaseMetrics]
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
            await Promise.all([fetchCase(), fetchCaseMetrics(true), fetchCaseUserActions()]);
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
      isLoadingUserActions,
      isLoadingMetrics,
      isLoading,
      refreshRef,
      fetchCaseUserActions,
    ]);

    const currentExternalIncident = useMemo(
      () =>
        data?.caseServices != null && data.caseServices[caseData.connector.id] != null
          ? data.caseServices[caseData.connector.id]
          : null,
      [data?.caseServices, caseData.connector]
    );

    const onSubmitTitle = useCallback(
      (newTitle) =>
        onUpdateField({
          key: 'title',
          value: newTitle,
        }),
      [onUpdateField]
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

    const tabs = useMemo(
      () => [
        {
          id: CASE_VIEW_PAGE_TABS.ACTIVITY,
          name: ACTIVITY_TAB,
          content: (
            <CaseViewActivity
              ruleDetailsNavigation={ruleDetailsNavigation}
              caseData={caseData}
              actionsNavigation={actionsNavigation}
              showAlertDetails={showAlertDetails}
              updateCase={fetchCase}
              fetchCaseMetrics={fetchCaseMetrics}
              useFetchAlertData={useFetchAlertData}
            />
          ),
        },
        ...(features.alerts.enabled
          ? [
              {
                id: CASE_VIEW_PAGE_TABS.ALERTS,
                name: (
                  <>
                    {ALERTS_TAB}
                    <ExperimentalBadge
                      label={EXPERIMENTAL_LABEL}
                      size="s"
                      iconType="beaker"
                      tooltipContent={EXPERIMENTAL_DESC}
                      tooltipPosition="bottom"
                    />
                  </>
                ),
                content: <CaseViewAlerts caseData={caseData} />,
              },
            ]
          : []),
      ],
      [
        actionsNavigation,
        caseData,
        caseId,
        features.alerts.enabled,
        fetchCase,
        fetchCaseMetrics,
        ruleDetailsNavigation,
        showAlertDetails,
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
          border={false}
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

        <WhitePageWrapperNoBorder>
          {!isLoadingUserActions && metricsFeatures.length > 0 ? (
            <>
              <EuiFlexGroup>
                <EuiFlexItem>
                  <CaseViewMetrics
                    data-test-subj="case-view-metrics"
                    isLoading={isLoadingMetrics}
                    metrics={metrics}
                    features={metricsFeatures}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="xs" />
            </>
          ) : null}
          <EuiTabs>{renderTabs()}</EuiTabs>
          <EuiSpacer size="l" />
          <EuiFlexGroup data-test-subj={`case-view-tab-content-${activeTabId}`}>
            {selectedTabContent}
          </EuiFlexGroup>
        </WhitePageWrapperNoBorder>
        {timelineUi?.renderTimelineDetailsPanel ? timelineUi.renderTimelineDetailsPanel() : null}
      </>
    );
  }
);
CaseViewPage.displayName = 'CaseViewPage';
