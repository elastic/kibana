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

export const SummarySection = () => {
  const getStats = useCloudPostureStatsApi();

  return (
    <EuiFlexGrid columns={3}>
      <EuiFlexItem>
        <ComplianceStats />
      </EuiFlexItem>
      <EuiFlexItem>
        <ChartPanel
          chart={ResourcesAtRiskChart}
          title="Top 5 Resources Types At Risk"
          description="Non compliant first"
          data={getStats.data?.resourcesEvaluations}
          isLoading={getStats.isLoading}
          isError={getStats.isError}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <ChartPanel
          chart={ScorePerAccountChart}
          title="Score Per Account / Cluster"
          description="Non compliant first"
          // TODO: no api for this chart yet, using empty state for now
          data={[]}
          isLoading={getStats.isLoading}
          isError={getStats.isError}
        />
      </EuiFlexItem>
    </EuiFlexGrid>
  );
};
