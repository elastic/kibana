/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';

import { Case, UpdateKey } from '../../../common/ui';
import { EditableTitle } from '../header_page/editable_title';
import { ContentWrapper, WhitePageWrapper } from '../wrappers';
import { CaseActionBar } from '../case_action_bar';
import { useGetCaseUserActions } from '../../containers/use_get_case_user_actions';
import { useTimelineContext } from '../timeline_context/use_timeline_context';
import { useCasesContext } from '../cases_context/use_cases_context';
import { HeaderPage } from '../header_page';
import { useCasesTitleBreadcrumbs } from '../use_breadcrumbs';
import { useGetCaseMetrics } from '../../containers/use_get_case_metrics';
import { CaseViewMetrics } from './metrics';
import type { CaseViewPageProps } from './types';
import { useCasesFeatures } from '../cases_context/use_cases_features';
import { useOnUpdateField } from './use_on_update_field';
import { CaseViewActivity } from './components/case_view_activity';

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
            </EuiFlexGroup>
          </ContentWrapper>
        </WhitePageWrapper>
        {timelineUi?.renderTimelineDetailsPanel ? timelineUi.renderTimelineDetailsPanel() : null}
      </>
    );
  }
);
CaseViewPage.displayName = 'CaseViewPage';
