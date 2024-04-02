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
  EuiSpacer,
} from '@elastic/eui';
import prettyMilliseconds from 'pretty-ms';
import { CaseStatuses } from '../../../common/types/domain';
import { useGetCasesStatus } from '../../containers/use_get_cases_status';
import { StatusStats } from '../status/status_stats';
import { useGetCasesMetrics } from '../../containers/use_get_cases_metrics';
import { ATTC_DESCRIPTION, ATTC_STAT } from './translations';

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
    <>
      <EuiPanel hasBorder paddingSize="m" grow={false}>
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
      </EuiPanel>
      <EuiSpacer size="l" />
    </>
  );
};
CasesMetrics.displayName = 'CasesMetrics';
