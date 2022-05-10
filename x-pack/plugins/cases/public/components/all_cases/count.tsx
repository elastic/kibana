/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useEffect } from 'react';
import {
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiToolTip,
} from '@elastic/eui';
import styled, { css } from 'styled-components';
import { CaseStatuses } from '../../../common/api';
import { useGetCasesStatus } from '../../containers/use_get_cases_status';
import { StatusStats } from '../status/status_stats';
import { useGetCasesMetrics } from '../../containers/use_get_cases_metrics';
import { MTTR_DESCRIPTION, MTTR_STAT } from './translations';

interface CountProps {
  refresh?: number;
}
const CountFlexGroup = styled.div`
  ${({ theme }) => css`
    .euiFlexGroup {
      border: ${theme.eui.euiBorderThin};
      border-radius: ${theme.eui.euiBorderRadius};
      /* padding: ${theme.eui.euiSizeS}; */
      margin: 0 0 ${theme.eui.euiSizeL} 0;
    }
  `}
`;

export const Count: FunctionComponent<CountProps> = ({ refresh }) => {
  const {
    countOpenCases,
    countInProgressCases,
    countClosedCases,
    isLoading: isCasesStatusLoading,
    fetchCasesStatus,
  } = useGetCasesStatus();

  const { mttr, isLoading: isCasesMetricsLoading, fetchCasesMetrics } = useGetCasesMetrics();

  useEffect(() => {
    if (refresh != null) {
      fetchCasesStatus();
      fetchCasesMetrics();
    }
  }, [fetchCasesMetrics, fetchCasesStatus, refresh]);

  return (
    <CountFlexGroup>
      <EuiFlexGroup responsive={true}>
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
                  <EuiToolTip position="right" content={MTTR_DESCRIPTION}>
                    <>
                      {MTTR_STAT} <EuiIcon type="questionInCircle" />
                    </>
                  </EuiToolTip>
                ),
                description: isCasesMetricsLoading ? (
                  <EuiLoadingSpinner data-test-subj={`mttr-stat-loading-spinner`} />
                ) : (
                  mttr ?? 'N/A'
                ),
              },
            ]}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </CountFlexGroup>
  );
};
Count.displayName = 'Count';
