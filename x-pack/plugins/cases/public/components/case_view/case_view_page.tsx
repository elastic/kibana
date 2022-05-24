/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBetaBadge, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTab, EuiTabs } from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useQueryClient } from 'react-query';
import styled from 'styled-components';
import { useCaseViewNavigation, useUrlParams } from '../../common/navigation';
import { useGetCaseUserActions } from '../../containers/use_get_case_user_actions';
import { useCasesContext } from '../cases_context/use_cases_context';
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
    const { navigateToCaseView } = useCaseViewNavigation();
    const { urlParams } = useUrlParams();
    const queryClient = useQueryClient();

    useCasesTitleBreadcrumbs(caseData.title);

    const activeTabId = useMemo(() => {
      if (urlParams.tabId && Object.values(CASE_VIEW_PAGE_TABS).includes(urlParams.tabId)) {
        return urlParams.tabId;
      }
      return CASE_VIEW_PAGE_TABS.ACTIVITY;
    }, [urlParams.tabId]);

    const init = useRef(true);
    const timelineUi = useTimelineContext()?.ui;

    const {
      data: userActionsData,
      refetch: fetchCaseUserActions,
      isLoading: isLoadingUserActions,
    } = useGetCaseUserActions(caseData.id, caseData.connector.id);

    const handleRefresh = useCallback(() => {
      queryClient.invalidateQueries('case');
    }, [queryClient]);

    const { onUpdateField, isLoading, loadingKey } = useOnUpdateField({
      caseId,
      caseData,
      handleUpdateField: handleRefresh,
    });

    // Set `refreshRef` if needed
    useEffect(() => {
      let isStale = false;
      if (refreshRef) {
        refreshRef.current = {
          refreshCase: async () => {
            // Do nothing if component (or instance of this render cycle) is stale or it is already loading
            if (isStale || isLoading || isLoadingUserActions) {
              return;
            }
            handleRefresh();
          },
        };
        return () => {
          isStale = true;
          refreshRef.current = null;
        };
      }
    }, [
      fetchCase,
      isLoadingUserActions,
      isLoading,
      refreshRef,
      fetchCaseUserActions,
      handleRefresh,
    ]);

    const currentExternalIncident = useMemo(
      () =>
        userActionsData?.caseServices != null &&
        userActionsData.caseServices[caseData.connector.id] != null
          ? userActionsData.caseServices[caseData.connector.id]
          : null,
      [userActionsData?.caseServices, caseData.connector]
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
        features.alerts.enabled,
        fetchCase,
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
          {!isLoadingUserActions ? (
            <>
              <EuiFlexGroup>
                <EuiFlexItem>
                  <CaseViewMetrics data-test-subj="case-view-metrics" caseId={caseData.id} />
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
