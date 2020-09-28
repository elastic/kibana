/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiSpacer, EuiText } from '@elastic/eui';
import React, { FC } from 'react';
import { Ping } from '../../../../common/runtime_types';
import { JourneyState } from '../../../state/reducers/journey';
import { StepComponent } from './executed_step';

interface StepStatusCount {
  succeeded: number;
  failed: number;
}

function statusMessage(count: StepStatusCount) {
  if (count.succeeded === 0) {
    return `${count.failed} Steps - all failed.`;
  } else if (count.failed === 0) {
    return `${count.succeeded} Steps - all succeeded`;
  }
  return `${count.succeeded + count.failed} Steps - ${count.succeeded} succeeded`;
}

function reduceStepStatus(prev: StepStatusCount, cur: Ping): StepStatusCount {
  if (cur.synthetics?.payload?.status === 'succeeded') {
    prev.succeeded += 1;
    return prev;
  }
  prev.failed += 1;
  return prev;
}

interface ExecutedJourneyProps {
  journey: JourneyState;
  fetchScreenshot: (stepIndex: number) => void;
}

export const ExecutedJourney: FC<ExecutedJourneyProps> = ({ journey, fetchScreenshot }) => {
  return (
    <div>
      <EuiText>
        <h3>Summary information</h3>
        <p>{statusMessage(journey.steps.reduce(reduceStepStatus, { succeeded: 0, failed: 0 }))}</p>
      </EuiText>
      <EuiSpacer />
      <EuiFlexGroup direction="column">
        {journey.steps
          .filter((step) => step.synthetics?.type === 'step/end')
          .map((step, index) => (
            <StepComponent
              key={index}
              index={index}
              step={step}
              fetchScreenshot={fetchScreenshot}
            />
          ))}
      </EuiFlexGroup>
    </div>
  );
};
