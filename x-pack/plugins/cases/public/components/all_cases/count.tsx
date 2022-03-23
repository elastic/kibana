/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useEffect } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { CaseStatuses } from '../../../common/api';
import { Stats } from '../status';
import { useGetCasesStatus } from '../../containers/use_get_cases_status';

interface CountProps {
  refresh?: number;
}
export const Count: FunctionComponent<CountProps> = ({ refresh }) => {
  const {
    countOpenCases,
    countInProgressCases,
    countClosedCases,
    isLoading: isCasesStatusLoading,
    fetchCasesStatus,
  } = useGetCasesStatus();
  useEffect(() => {
    if (refresh != null) {
      fetchCasesStatus();
    }
  }, [fetchCasesStatus, refresh]);
  return (
    <EuiFlexGroup responsive={false}>
      <EuiFlexItem grow={false}>
        <Stats
          dataTestSubj="openStatsHeader"
          caseCount={countOpenCases}
          caseStatus={CaseStatuses.open}
          isLoading={isCasesStatusLoading}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <Stats
          dataTestSubj="inProgressStatsHeader"
          caseCount={countInProgressCases}
          caseStatus={CaseStatuses['in-progress']}
          isLoading={isCasesStatusLoading}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <Stats
          dataTestSubj="closedStatsHeader"
          caseCount={countClosedCases}
          caseStatus={CaseStatuses.closed}
          isLoading={isCasesStatusLoading}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
Count.displayName = 'Count';
