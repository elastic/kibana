/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import { CoverageOverviewLink } from '../../../../common/components/links_to_docs';
import { HeaderPage } from '../../../../common/components/header_page';

import * as i18n from './translations';
import { CoverageOverviewTacticPanel } from './tactic_panel';
import { CoverageOverviewMitreTechniquePanelPopover } from './technique_panel_popover';
import { CoverageOverviewFiltersPanel } from './filters_panel';
import { useCoverageOverviewDashboardContext } from './coverage_overview_dashboard_context';

const CoverageOverviewHeaderComponent = () => (
  <HeaderPage
    title={i18n.COVERAGE_OVERVIEW_DASHBOARD_TITLE}
    subtitle={
      <EuiText color="subdued" size="s">
        <span>{i18n.CoverageOverviewDashboardInformation}</span> <CoverageOverviewLink />
      </EuiText>
    }
  />
);

const CoverageOverviewHeader = React.memo(CoverageOverviewHeaderComponent);

const CoverageOverviewDashboardComponent = () => {
  const {
    state: { data },
  } = useCoverageOverviewDashboardContext();

  return (
    <>
      <CoverageOverviewHeader />
      <CoverageOverviewFiltersPanel />
      <EuiSpacer />
      <EuiFlexGroup gutterSize="m" className="eui-xScroll">
        {data?.mitreTactics.map((tactic) => (
          <EuiFlexGroup direction="column" key={tactic.id} gutterSize="s">
            <EuiFlexItem grow={false}>
              <CoverageOverviewTacticPanel tactic={tactic} />
            </EuiFlexItem>

            {tactic.techniques.map((technique, techniqueKey) => (
              <EuiFlexItem grow={false} key={`${technique.id}-${techniqueKey}`}>
                <CoverageOverviewMitreTechniquePanelPopover technique={technique} />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        ))}
      </EuiFlexGroup>
    </>
  );
};

export const CoverageOverviewDashboard = CoverageOverviewDashboardComponent;
