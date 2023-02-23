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
  EuiIcon,
  EuiLoadingSpinner,
  EuiToolTip,
} from '@elastic/eui';
import styled, { css } from 'styled-components';
import prettyMilliseconds from 'pretty-ms';
import { CaseStatuses } from '../../../common/api';
import { useGetCasesStatus } from '../../containers/use_get_cases_status';
import { StatusStats } from '../status/status_stats';
import { useGetCasesMetrics } from '../../containers/use_get_cases_metrics';
import { ATTC_DESCRIPTION, ATTC_STAT } from './translations';

const MetricsFlexGroup = styled.div`
  ${({ theme }) => css`
    border: ${theme.eui.euiBorderThin};
    border-radius: ${theme.eui.euiBorderRadius};
    padding: ${theme.eui.euiSizeM};
    margin-bottom: ${theme.eui.euiSizeL};
  `}
`;

export const CasesMetrics: React.FC = () => {
  const {
    data: { countOpenCases, countInProgressCases, countClosedCases } = {
      countOpenCases: 0,
      countInProgressCases: 0,
      countClosedCases: 0,
    },
    isLoading: isCasesStatusLoading,
  } = useGetCasesStatus();

  const { data: { mttr } = { mttr: 0 }, isLoading: isCasesMetricsLoading } = useGetCasesMetrics();

  const mttrValue = useMemo(
    () => (mttr != null ? prettyMilliseconds(mttr * 1000, { compact: true, verbose: false }) : '-'),
    [mttr]
  );

  return (
    <MetricsFlexGroup>
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
                  <EuiToolTip position="right" content={ATTC_DESCRIPTION}>
                    <>
                      {ATTC_STAT} <EuiIcon type="questionInCircle" />
                    </>
                  </EuiToolTip>
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
    </MetricsFlexGroup>
  );
};
CasesMetrics.displayName = 'CasesMetrics';
