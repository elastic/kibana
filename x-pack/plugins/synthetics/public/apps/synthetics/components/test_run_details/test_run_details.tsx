/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';
import moment from 'moment';
import { MonitorDetailsPanel } from '../monitor_details/monitor_summary/monitor_details_panel';
import { useJourneySteps } from '../monitor_details/hooks/use_journey_steps';
import { StepDurationPanel } from '../monitor_details/monitor_summary/step_duration_panel';
import { TestRunSteps } from './test_run_steps';
import { useTestRunDetailsBreadcrumbs } from './hooks/use_test_run_details_breadcrumbs';

export const TestRunDetails = () => {
  const { data: stepsData, loading: stepsLoading } = useJourneySteps();

  useTestRunDetailsBreadcrumbs([
    { text: stepsData ? moment(stepsData.details?.timestamp).format('LLL') : '' },
  ]);

  return (
    <EuiFlexGroup gutterSize="m">
      <EuiFlexItem grow={2}>
        <EuiPanel hasShadow={false} hasBorder>
          <EuiTitle size="xs">
            {/* TODO: Add step detail panel*/}
            <h3>Step 1 of {stepsData?.steps.length}</h3>
          </EuiTitle>
        </EuiPanel>
        <EuiSpacer size="m" />
        <TestRunSteps isLoading={stepsLoading} steps={stepsData?.steps ?? []} />
      </EuiFlexItem>
      <EuiFlexItem grow={1}>
        <StepDurationPanel legendPosition="bottom" />
        <EuiSpacer size="m" />
        <MonitorDetailsPanel />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
