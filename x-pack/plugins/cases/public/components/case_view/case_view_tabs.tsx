/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiThemeComputed } from '@elastic/eui';
import {
  EuiNotificationBadge,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { css } from '@emotion/react';
import { CASE_VIEW_PAGE_TABS } from '../../../common/types';
import { useCaseViewNavigation } from '../../common/navigation';
import { useCasesContext } from '../cases_context/use_cases_context';
import {
  ACTIVITY_TAB,
  ALERTS_TAB,
  FILES_TAB,
  OBSERVABLES_TAB,
  SIMILAR_CASES_TAB,
} from './translations';
import type { CaseUI } from '../../../common';
import { useGetCaseFileStats } from '../../containers/use_get_case_file_stats';
import { useCaseObservables } from './use_case_observables';
import { ExperimentalBadge } from '../experimental_badge/experimental_badge';
import { useGetSimilarCases } from '../../containers/use_get_similar_cases';

const TabTitle = ({ title }: { title: string }) => (
  <EuiTitle size="xxs">
    <h2 className="eui-displayInline">{title}</h2>
  </EuiTitle>
);

TabTitle.displayName = 'TabTitle';

const FilesBadge = ({
  activeTab,
  fileStatsData,
  isLoading,
  euiTheme,
}: {
  activeTab: string;
  fileStatsData: { total: number } | undefined;
  isLoading: boolean;
  euiTheme: EuiThemeComputed<{}>;
}) => (
  <>
    {!isLoading && fileStatsData && (
      <EuiNotificationBadge
        css={css`
          margin-left: ${euiTheme.size.xs};
        `}
        data-test-subj="case-view-files-stats-badge"
        color={activeTab === CASE_VIEW_PAGE_TABS.FILES ? 'accent' : 'subdued'}
      >
        {fileStatsData.total > 0 ? fileStatsData.total : 0}
      </EuiNotificationBadge>
    )}
  </>
);

FilesBadge.displayName = 'FilesBadge';

const ObservablesBadge = ({
  activeTab,
  isLoading,
  euiTheme,
  count,
}: {
  activeTab: string;
  count: number;
  isLoading: boolean;
  euiTheme: EuiThemeComputed<{}>;
}) => (
  <>
    {!isLoading && (
      <EuiNotificationBadge
        css={css`
          margin-left: ${euiTheme.size.xs};
        `}
        data-test-subj="case-view-observables-stats-badge"
        color={activeTab === CASE_VIEW_PAGE_TABS.OBSERVABLES ? 'accent' : 'subdued'}
      >
        {count}
      </EuiNotificationBadge>
    )}
    <ExperimentalBadge compact />
  </>
);

ObservablesBadge.displayName = 'ObservablesBadge';

const AlertsBadge = ({
  activeTab,
  totalAlerts,
  isExperimental,
  euiTheme,
}: {
  activeTab: string;
  totalAlerts: number | undefined;
  isExperimental: boolean;
  euiTheme: EuiThemeComputed<{}>;
}) => (
  <>
    <EuiNotificationBadge
      css={css`
        margin-left: ${euiTheme.size.xs};
      `}
      data-test-subj="case-view-alerts-stats-badge"
      color={activeTab === CASE_VIEW_PAGE_TABS.ALERTS ? 'accent' : 'subdued'}
    >
      {totalAlerts || 0}
    </EuiNotificationBadge>
    {isExperimental && (
      <ExperimentalBadge compact data-test-subj="case-view-alerts-table-experimental-badge" />
    )}
  </>
);

AlertsBadge.displayName = 'AlertsBadge';

const SimilarCasesBadge = ({
  activeTab,
  count,
  isLoading,
  euiTheme,
}: {
  activeTab: string;
  count?: number;
  isLoading: boolean;
  euiTheme: EuiThemeComputed<{}>;
}) => (
  <>
    {!isLoading && (
      <EuiNotificationBadge
        css={css`
          margin-left: ${euiTheme.size.xs};
        `}
        data-test-subj="case-view-similar-cases-badge"
        color={activeTab === CASE_VIEW_PAGE_TABS.SIMILAR_CASES ? 'accent' : 'subdued'}
      >
        {count ?? 0}
      </EuiNotificationBadge>
    )}
    <ExperimentalBadge compact />
  </>
);

SimilarCasesBadge.displayName = 'SimilarCasesBadge';

export interface CaseViewTabsProps {
  caseData: CaseUI;
  activeTab: CASE_VIEW_PAGE_TABS;
}

export const CaseViewTabs = React.memo<CaseViewTabsProps>(({ caseData, activeTab }) => {
  const { features } = useCasesContext();
  const { navigateToCaseView } = useCaseViewNavigation();
  const { euiTheme } = useEuiTheme();
  const { data: fileStatsData, isLoading: isLoadingFiles } = useGetCaseFileStats({
    caseId: caseData.id,
  });
  const { observables, isLoading: isLoadingObservables } = useCaseObservables(caseData);

  const observableStatsData = useMemo(() => ({ total: observables.length }), [observables.length]);
  const { data: similarCasesData, isFetching: isLoadingSimilarCases } = useGetSimilarCases({
    caseData,
    pageSize: 0,
    pageIndex: 0,
  });

  const tabs = useMemo(
    () => [
      {
        id: CASE_VIEW_PAGE_TABS.ACTIVITY,
        name: ACTIVITY_TAB,
      },
      ...(features.alerts.enabled
        ? [
            {
              id: CASE_VIEW_PAGE_TABS.ALERTS,
              name: ALERTS_TAB,
              badge: (
                <AlertsBadge
                  isExperimental={features.alerts.isExperimental}
                  totalAlerts={caseData.totalAlerts}
                  activeTab={activeTab}
                  euiTheme={euiTheme}
                />
              ),
            },
          ]
        : []),
      {
        id: CASE_VIEW_PAGE_TABS.FILES,
        name: FILES_TAB,
        badge: (
          <FilesBadge
            isLoading={isLoadingFiles}
            fileStatsData={fileStatsData}
            activeTab={activeTab}
            euiTheme={euiTheme}
          />
        ),
      },
      {
        id: CASE_VIEW_PAGE_TABS.OBSERVABLES,
        name: OBSERVABLES_TAB,
        badge: (
          <ObservablesBadge
            isLoading={isLoadingObservables}
            count={observableStatsData.total}
            activeTab={activeTab}
            euiTheme={euiTheme}
          />
        ),
      },
      {
        id: CASE_VIEW_PAGE_TABS.SIMILAR_CASES,
        name: SIMILAR_CASES_TAB,
        badge: (
          <SimilarCasesBadge
            activeTab={activeTab}
            euiTheme={euiTheme}
            count={similarCasesData?.total}
            isLoading={isLoadingSimilarCases}
          />
        ),
      },
    ],
    [
      features.alerts.enabled,
      features.alerts.isExperimental,
      caseData.totalAlerts,
      activeTab,
      euiTheme,
      isLoadingFiles,
      fileStatsData,
      isLoadingObservables,
      observableStatsData,
      similarCasesData?.total,
      isLoadingSimilarCases,
    ]
  );

  const renderTabs = useCallback(() => {
    return tabs.map((tab, index) => (
      <EuiTab
        data-test-subj={`case-view-tab-title-${tab.id}`}
        key={index}
        onClick={() => navigateToCaseView({ detailName: caseData.id, tabId: tab.id })}
        isSelected={tab.id === activeTab}
      >
        <TabTitle title={tab.name} />
        {tab.badge ?? null}
      </EuiTab>
    ));
  }, [activeTab, caseData.id, navigateToCaseView, tabs]);

  return (
    <>
      <EuiTabs data-test-subj="case-view-tabs">{renderTabs()}</EuiTabs>
      <EuiSpacer size="l" />
    </>
  );
});
CaseViewTabs.displayName = 'CaseViewTabs';
