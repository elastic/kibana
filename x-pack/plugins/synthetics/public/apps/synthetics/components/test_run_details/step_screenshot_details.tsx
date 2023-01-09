/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import React from 'react';
import { useParams } from 'react-router-dom';
import { JourneyStep } from '../../../../../common/runtime_types';
import { JourneyStepScreenshotContainer } from '../common/screenshot/journey_step_screenshot_container';

export const StepScreenshotDetails = ({
  stepIndex,
  step,
}: {
  stepIndex: number;
  step?: JourneyStep;
}) => {
  const { checkGroupId } = useParams<{ checkGroupId: string }>();

  return (
    <EuiPanel hasShadow={false} hasBorder={false} color="subdued">
      <EuiFlexGroup>
        <EuiFlexItem css={{ alignItems: 'flex-start' }}>
          <JourneyStepScreenshotContainer
            key={stepIndex}
            checkGroup={step?.monitor.check_group ?? checkGroupId}
            initialStepNumber={stepIndex}
            stepStatus={step?.synthetics.payload?.status}
            allStepsLoaded={true}
            retryFetchOnRevisit={false}
            size={[180, 112]}
          />
        </EuiFlexItem>
        <EuiFlexItem>{/* TODO: add image details*/}</EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
