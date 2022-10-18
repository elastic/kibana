/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { CSSProperties } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, useEuiTheme } from '@elastic/eui';
import { JourneyStep } from '../../../../../../common/runtime_types';
import { JourneyStepScreenshotContainer } from '../screenshot/journey_step_screenshot_container';
import { getTextColorForMonitorStatus, parseBadgeStatus } from './status_badge';

interface Props {
  step: JourneyStep;
  stepLabels?: string[];
  allStepsLoaded?: boolean;
  compactView?: boolean;
}

export const JourneyStepScreenshotWithLabel = ({
  step,
  stepLabels = [],
  compactView,
  allStepsLoaded,
}: Props) => {
  const { euiTheme } = useEuiTheme();
  const status = parseBadgeStatus(step.synthetics.step?.status ?? '');
  const textColor = euiTheme.colors[getTextColorForMonitorStatus(status)] as CSSProperties['color'];

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" wrap>
      <EuiFlexItem grow={false}>
        <JourneyStepScreenshotContainer
          checkGroup={step.monitor.check_group}
          initialStepNo={step.synthetics?.step?.index}
          stepStatus={step.synthetics.payload?.status}
          allStepsLoaded={allStepsLoaded}
          stepLabels={stepLabels}
          retryFetchOnRevisit={false}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false} style={{ minWidth: 80 }}>
        <EuiText color={textColor} size={compactView ? 's' : 'm'}>
          {step.synthetics?.step?.name}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
