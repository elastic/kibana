/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBetaBadge, EuiSpacer, EuiTab, EuiTabs } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { CASE_VIEW_PAGE_TABS } from '../../../common/types';
import { useCaseViewNavigation } from '../../common/navigation';
import { useCasesContext } from '../cases_context/use_cases_context';
import { EXPERIMENTAL_DESC, EXPERIMENTAL_LABEL } from '../header_page/translations';
import { useCasesTitleBreadcrumbs } from '../use_breadcrumbs';
import { ACTIVITY_TAB, ALERTS_TAB } from './translations';
import type { Case } from '../../../common';

const ExperimentalBadge = styled(EuiBetaBadge)`
  margin-left: 5px;
`;

export interface CaseViewTabsProps {
  caseData: Case;
  activeTab: CASE_VIEW_PAGE_TABS;
}

export const CaseViewTabs = React.memo<CaseViewTabsProps>(({ caseData, activeTab }) => {
  const { features } = useCasesContext();
  const { navigateToCaseView } = useCaseViewNavigation();
  useCasesTitleBreadcrumbs(caseData.title);

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
              name: (
                <>
                  {ALERTS_TAB}
                  {features.alerts.isExperimental ? (
                    <ExperimentalBadge
                      label={EXPERIMENTAL_LABEL}
                      size="s"
                      iconType="beaker"
                      tooltipContent={EXPERIMENTAL_DESC}
                      tooltipPosition="bottom"
                      data-test-subj="case-view-alerts-table-experimental-badge"
                    />
                  ) : null}
                </>
              ),
            },
          ]
        : []),
    ],
    [features.alerts.enabled, features.alerts.isExperimental]
  );

  const renderTabs = useCallback(() => {
    return tabs.map((tab, index) => (
      <EuiTab
        data-test-subj={`case-view-tab-title-${tab.id}`}
        key={index}
        onClick={() => navigateToCaseView({ detailName: caseData.id, tabId: tab.id })}
        isSelected={tab.id === activeTab}
      >
        {tab.name}
      </EuiTab>
    ));
  }, [activeTab, caseData.id, navigateToCaseView, tabs]);

  return (
    <>
      <EuiTabs>{renderTabs()}</EuiTabs>
      <EuiSpacer size="l" />
    </>
  );
});
CaseViewTabs.displayName = 'CaseViewTabs';
