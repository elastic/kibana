/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGrid, EuiFlexItem } from '@elastic/eui';
import { CloudPostureScoreChart } from '../compliance_charts/cloud_posture_score_chart';
import { ResourcesAtRiskChart } from '../compliance_charts/resources_at_risk_chart';
import { ScorePerAccountChart } from '../compliance_charts/score_per_account_chart';
import { ChartPanel } from '../../../components/chart_panel';
import { ComplianceScoreBadge } from '../compliance_charts/compliance_score_badge';
import { ComplianceStats } from '../compliance_charts/compliance_stats';

export const SummarySection = () => (
  <EuiFlexGrid columns={3}>
    <EuiFlexItem>
      {/* <ChartPanel*/}
      {/*  title="Cloud Posture Score"*/}
      {/*  description="Percentage out of all policy rules passed"*/}
      {/*  chart={ComplianceScoreBadge}*/}
      {/* />*/}
      <ComplianceStats />
    </EuiFlexItem>
    <EuiFlexItem>
      <ChartPanel
        title="Top 5 Resources Types At Risk"
        description="Non compliant first"
        chart={ResourcesAtRiskChart}
      />
    </EuiFlexItem>
    <EuiFlexItem>
      <ChartPanel
        title="Score Per Account / Cluster"
        description="Non compliant first"
        chart={ScorePerAccountChart}
      />
    </EuiFlexItem>
  </EuiFlexGrid>
);
