/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';
import moment from 'moment';
import { FormattedMessage } from '@kbn/i18n-react';
import { useParams } from 'react-router-dom';
import { useSelectedLocation } from '../monitor_details/hooks/use_selected_location';
import { MonitorDetailsLinkPortal } from '../monitor_add_edit/monitor_details_portal';
import { StepNumberNav } from './components/step_number_nav';
import { StepScreenshotDetails } from './step_screenshot_details';
import { StepTabs } from './step_tabs';
import { MonitorDetailsPanel } from '../monitor_details/monitor_summary/monitor_details_panel';
import { useJourneySteps } from '../monitor_details/hooks/use_journey_steps';
import { StepDurationPanel } from '../monitor_details/monitor_summary/step_duration_panel';
import { TestRunSteps } from './test_run_steps';
import { useTestRunDetailsBreadcrumbs } from './hooks/use_test_run_details_breadcrumbs';

export const TestRunDetails = () => {
  // Step index from starts at 1 in synthetics
  const [stepIndex, setStepIndex] = React.useState(1);

  const { data: stepsData, loading: stepsLoading, stepEnds } = useJourneySteps();

  useTestRunDetailsBreadcrumbs([
    { text: stepsData ? moment(stepsData.details?.timestamp).format('LLL') : '' },
  ]);

  const step = stepEnds.find((stepN) => stepN.synthetics?.step?.index === stepIndex);

  const totalSteps = stepsLoading ? 1 : stepEnds.length;

  const { monitorId } = useParams<{ monitorId: string }>();
  const selectedLocation = useSelectedLocation();

  return (
    <>
      <EuiFlexGroup gutterSize="m">
        <EuiFlexItem grow={2}>
          <EuiPanel hasShadow={false} hasBorder>
            <EuiFlexGroup alignItems="center">
              <EuiFlexItem grow={true}>
                <EuiTitle size="xs">
                  <h3>
                    <FormattedMessage
                      id="xpack.synthetics.synthetics.testDetail.totalSteps"
                      defaultMessage="Step {stepIndex} of {totalSteps}"
                      values={{
                        stepIndex,
                        totalSteps,
                      }}
                    />
                  </h3>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <StepNumberNav
                  stepIndex={stepIndex}
                  totalSteps={totalSteps}
                  handleNextStep={() => {
                    setStepIndex(stepIndex + 1);
                  }}
                  handlePreviousStep={() => {
                    setStepIndex(stepIndex - 1);
                  }}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="m" />
            <StepScreenshotDetails stepIndex={stepIndex} step={step} />
            <EuiSpacer size="m" />
            <StepTabs stepsData={stepsData} step={step} loading={stepsLoading} />
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
      {/* needed to render the monitor details link in breadcrumb*/}
      <MonitorDetailsLinkPortal
        configId={monitorId}
        name={stepsData?.details?.journey.monitor.name ?? ''}
        locationId={selectedLocation?.id}
      />
    </>
  );
};
