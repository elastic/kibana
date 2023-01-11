/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { StepDurationPanel } from '../monitor_details/monitor_summary/step_duration_panel';
import { useFormatTestRunAt } from '../../utils/monitor_test_result/test_time_formats';
import { LastTestRunComponent } from '../monitor_details/monitor_summary/last_test_run';
import { MonitorDetailsPanel } from '../monitor_details/monitor_summary/monitor_details_panel';
import { useStepDetails } from './hooks/use_step_details';
import { StepDetails } from '../test_run_details/components/step_details';
import { PanelWithTitle } from '../common/components/panel_with_title';
import { useErrorFailedTests } from './hooks/use_error_failed_tests';
import { useJourneySteps } from '../monitor_details/hooks/use_journey_steps';
import { FailedTestsList } from './components/failed_tests_list';
import { ErrorTimeline } from './components/error_timeline';
import { useErrorDetailsBreadcrumbs } from './hooks/use_error_details_breadcrumbs';
import { StepImage } from '../step_details_page/step_screenshot/step_image';

export function ErrorDetailsPage() {
  const { failedTests, loading } = useErrorFailedTests();

  const checkGroupId = failedTests?.[0]?.monitor.check_group ?? '';

  const { data, isFailed, failedStep, loading: stepsLoading } = useJourneySteps(checkGroupId);

  const lastTestRun = failedTests?.[0];

  const startedAt = useFormatTestRunAt(lastTestRun?.state?.started_at);

  useErrorDetailsBreadcrumbs([{ text: startedAt }]);

  const stepDetails = useStepDetails({ checkGroup: lastTestRun?.monitor.check_group });

  return (
    <div>
      <PanelWithTitle title="Timeline">
        <ErrorTimeline />
      </PanelWithTitle>
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="m">
        <EuiFlexItem grow={2}>
          <PanelWithTitle title="Failed tests">
            <FailedTestsList failedTests={failedTests} loading={loading} />
          </PanelWithTitle>
          <EuiSpacer size="m" />
          <StepDetails {...stepDetails} />
          <EuiSpacer size="m" />
          <LastTestRunComponent
            latestPing={lastTestRun}
            loading={loading}
            stepsData={data}
            stepsLoading={stepsLoading}
            isErrorDetails={true}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={1} style={{ height: 'fit-content' }}>
          <PanelWithTitle>
            {data?.details?.journey && failedStep && (
              <StepImage ping={data?.details?.journey} step={failedStep} isFailed={isFailed} />
            )}
          </PanelWithTitle>

          <EuiSpacer size="m" />
          <StepDurationPanel doBreakdown={false} />
          <EuiSpacer size="m" />
          <MonitorDetailsPanel />
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
}
