/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import { SecuritySolutionPageWrapper } from '../../../../common/components/page_wrapper';
import { SpyRoute } from '../../../../common/utils/route/spy_routes';
import { SecurityPageName } from '../../../../app/types';
import { HeaderPage } from '../../../../common/components/header_page';

import * as i18n from './translations';
import { useFetchCoverageOverviewQuery } from '../../../rule_management/api/hooks/use_fetch_coverage_overview';

const CoverageOverviewPageComponent = () => {
  const { data } = useFetchCoverageOverviewQuery();

  return (
    <>
      <SecuritySolutionPageWrapper data-test-subj="coverageOverviewPage">
        <HeaderPage title={i18n.COVERAGE_OVERVIEW_DASHBOARD_TITLE} />
      </SecuritySolutionPageWrapper>

      <EuiFlexGroup>
        {data?.mitreTactics.map((tactic) => (
          <EuiFlexGroup direction="column">
            <EuiFlexItem grow={false}>
              <EuiPanel style={{ width: 100, height: 100, background: 'grey' }}>
                {tactic.name}
                <br />
                <small>{'Enabled: '}</small>
                <small>{tactic.enabledRules.length}</small>
                <br />
                <small>{'Disabled: '}</small>
                <small>{tactic.disabledRules.length}</small>
              </EuiPanel>
            </EuiFlexItem>

            {tactic.techniques.map((technique) => (
              <EuiFlexItem grow={false}>
                <EuiPanel style={{ width: 100, height: 100 }}>
                  {technique.name}
                  <br />
                  <small>{'Enabled: '}</small>
                  <small>{technique.enabledRules.length}</small>
                  <br />
                  <small>{'Disabled: '}</small>
                  <small>{technique.disabledRules.length}</small>
                </EuiPanel>
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
