/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGrid, EuiFlexItem } from '@elastic/eui';
import { ResourcesAtRiskChart } from '../compliance_charts/resources_at_risk_chart';
import { ScorePerAccountChart } from '../compliance_charts/score_per_account_chart';
import { ChartPanel } from '../../../components/chart_panel';
import { ComplianceStats } from '../compliance_charts/compliance_stats';
import { useCloudPostureStatsApi } from '../../../common/api';
import * as TEXT from '../translations';

export const SummarySection = () => {
  const getStats = useCloudPostureStatsApi();
  if (!getStats.isSuccess) return null;

  return (
    <EuiFlexGrid columns={3}>
      <EuiFlexItem>
        <ComplianceStats />
      </EuiFlexItem>
      <EuiFlexItem>
        <ChartPanel
          chart={ResourcesAtRiskChart}
          title={TEXT.TOP_5_CHART_TITLE}
          description={TEXT.NON_COMPLIANT_FIRST}
          data={getStats.data?.resourcesEvaluations}
          isLoading={getStats.isLoading}
          isError={getStats.isError}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <ChartPanel
          chart={ScorePerAccountChart}
          title={TEXT.SCORE_PER_CLUSTER_CHART_TITLE}
          description={TEXT.NON_COMPLIANT_FIRST}
          // TODO: no api for this chart yet, using empty state for now. needs BE
          data={[]}
          isLoading={getStats.isLoading}
          isError={getStats.isError}
        />
      </EuiFlexItem>
    </EuiFlexGrid>
  );
};
