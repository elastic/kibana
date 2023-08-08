/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useReducer } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { SecuritySolutionPageWrapper } from '../../../../common/components/page_wrapper';
import { SpyRoute } from '../../../../common/utils/route/spy_routes';
import { SecurityPageName } from '../../../../app/types';
import { HeaderPage } from '../../../../common/components/header_page';

import * as i18n from './translations';
import { useFetchCoverageOverviewQuery } from '../../../rule_management/api/hooks/use_fetch_coverage_overview';
import { CoverageOverviewTacticPanel } from './tactic_panel';
import { CoverageOverviewMitreTechniquePanelPopover } from './technique_panel_popover';
import { CoverageOverviewFiltersPanel } from './filters_panel';
import { createCoverageOverviewDashboardReducer, initialState } from './reducer';

const CoverageOverviewPageComponent = () => {
  const { data } = useFetchCoverageOverviewQuery();

  const [{ showExpandedCells }, dispatch] = useReducer(
    createCoverageOverviewDashboardReducer(),
    initialState
  );

  const setShowExpandedCells = useCallback(
    (value: boolean): void => {
      dispatch({
        type: 'setShowExpandedCells',
        value,
      });
    },
    [dispatch]
  );

  return (
    <>
      <SecuritySolutionPageWrapper data-test-subj="coverageOverviewPage">
        <HeaderPage title={i18n.COVERAGE_OVERVIEW_DASHBOARD_TITLE} />
      </SecuritySolutionPageWrapper>

      <CoverageOverviewFiltersPanel
        setShowExpandedCells={setShowExpandedCells}
        showExpandedCells={showExpandedCells}
      />
      <EuiSpacer />
      <EuiFlexGroup gutterSize="m" className="eui-xScroll">
        {data?.mitreTactics.map((tactic) => (
          <EuiFlexGroup direction="column" key={tactic.id} gutterSize="s">
            <EuiFlexItem grow={false}>
              <CoverageOverviewTacticPanel tactic={tactic} />
            </EuiFlexItem>

            {tactic.techniques.map((technique, techniqueKey) => (
              <EuiFlexItem grow={false} key={`${technique.id}-${techniqueKey}`}>
                <CoverageOverviewMitreTechniquePanelPopover
                  technique={technique}
                  isExpanded={showExpandedCells}
                />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        ))}
      </EuiFlexGroup>
      <SpyRoute pageName={SecurityPageName.coverageOverview} />
    </>
  );
};

export const CoverageOverviewPage = React.memo(CoverageOverviewPageComponent);
