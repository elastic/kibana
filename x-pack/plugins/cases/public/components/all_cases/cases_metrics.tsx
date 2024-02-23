/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiLoadingSpinner,
  EuiPanel,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import prettyMilliseconds from 'pretty-ms';
import { CaseStatuses } from '../../../common/types/domain';
import { useGetCasesStatus } from '../../containers/use_get_cases_status';
import { StatusStats } from '../status/status_stats';
import { useGetCasesMetrics } from '../../containers/use_get_cases_metrics';
import { ATTC_DESCRIPTION, ATTC_STAT } from './translations';

// const MetricsFlexGroup = styled.div`
//   ${({ theme }) => css`
//     border: ${theme.eui.euiBorderThin};
//     border-radius: ${theme.eui.euiBorderRadius};
//     padding: ${theme.eui.euiSizeM};
//     margin-bottom: ${theme.eui.euiSizeL};
//   `}
// `;

export const CasesMetrics: React.FC = () => {
  const {
    data: { countOpenCases, countInProgressCases, countClosedCases } = {
      countOpenCases: 0,
      countInProgressCases: 0,
      countClosedCases: 0,
    },
    isLoading: isCasesStatusLoading,
  } = useGetCasesStatus();
  const { euiTheme } = useEuiTheme();

  const { data: { mttr } = { mttr: 0 }, isLoading: isCasesMetricsLoading } = useGetCasesMetrics();

  const mttrValue = useMemo(
    () => (mttr != null ? prettyMilliseconds(mttr * 1000, { compact: true, verbose: false }) : '-'),
    [mttr]
  );

  return (
    <div
      css={css`
        border: ${euiTheme.border.thin};
        border-radius: ${euiTheme.border.radius};
        padding: ${euiTheme.size.m};
        margin-bottom: ${euiTheme.size.l};
      `}
    >
      <EuiFlexGroup responsive={true} data-test-subj="cases-metrics-stats">
        <EuiFlexItem grow={true}>
          <StatusStats
            dataTestSubj="openStatsHeader"
            caseCount={countOpenCases}
            caseStatus={CaseStatuses.open}
            isLoading={isCasesStatusLoading}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={true}>
          <StatusStats
            dataTestSubj="inProgressStatsHeader"
            caseCount={countInProgressCases}
            caseStatus={CaseStatuses['in-progress']}
            isLoading={isCasesStatusLoading}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={true}>
          <StatusStats
            dataTestSubj="closedStatsHeader"
            caseCount={countClosedCases}
            caseStatus={CaseStatuses.closed}
            isLoading={isCasesStatusLoading}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={true}>
          <EuiDescriptionList
            data-test-subj={'mttrStatsHeader'}
            textStyle="reverse"
            listItems={[
              {
                title: (
                  <>
                    {ATTC_STAT} <EuiIconTip content={ATTC_DESCRIPTION} position="right" />
                  </>
                ),
                description: isCasesMetricsLoading ? (
                  <EuiLoadingSpinner data-test-subj={`mttr-stat-loading-spinner`} />
                ) : (
                  mttrValue
                ),
              },
            ]}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
CasesMetrics.displayName = 'CasesMetrics';
