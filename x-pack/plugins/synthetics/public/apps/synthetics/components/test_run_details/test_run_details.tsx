/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import moment from 'moment';
import { MonitorDetailsPanel } from '../monitor_details/monitor_summary/monitor_details_panel';
import { useJourneySteps } from '../monitor_details/hooks/use_journey_steps';
import { StepDurationPanel } from '../monitor_details/monitor_summary/step_duration_panel';
import { TestRunSteps } from './test_run_steps';
import { useTestRunDetailsBreadcrumbs } from './hooks/use_test_run_details_breadcrumbs';
import { StepDetails } from './components/step_details';

export const TestRunDetails = () => {
  // Step index from starts at 1 in synthetics
  const [stepIndex, setStepIndex] = React.useState(1);

  const { data: stepsData, loading: stepsLoading, stepEnds } = useJourneySteps();

  useTestRunDetailsBreadcrumbs([
    { text: stepsData ? moment(stepsData.details?.timestamp).format('LLL') : '' },
  ]);

  const step = stepEnds.find((stepN) => stepN.synthetics?.step?.index === stepIndex);

  const totalSteps = stepsLoading ? 1 : stepEnds.length;

  return (
    <EuiFlexGroup gutterSize="m">
      <EuiFlexItem grow={2}>
        <StepDetails
          step={step}
          stepIndex={stepIndex}
          setStepIndex={setStepIndex}
          loading={stepsLoading}
          totalSteps={totalSteps}
          stepsData={stepsData}
        />
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
