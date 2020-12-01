/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { FC } from 'react';
import { Ping } from '../../../../common/runtime_types';
import { JourneyState } from '../../../state/reducers/journey';
import { ExecutedStep } from './executed_step';

interface StepStatusCount {
  failed: number;
  skipped: number;
  succeeded: number;
}

function statusMessage(count: StepStatusCount) {
  const total = count.succeeded + count.failed + count.skipped;
  if (count.failed + count.skipped === total) {
    return i18n.translate('xpack.uptime.synthetics.journey.allFailedMessage', {
      defaultMessage: '{total} Steps - all failed or skipped',
      values: { total },
    });
  } else if (count.succeeded === total) {
    return i18n.translate('xpack.uptime.synthetics.journey.allSucceededMessage', {
      defaultMessage: '{total} Steps - all succeeded',
      values: { total },
    });
  }
  return i18n.translate('xpack.uptime.synthetics.journey.partialSuccessMessage', {
    defaultMessage: '{total} Steps - {succeeded} succeeded',
    values: { succeeded: count.succeeded, total },
  });
}

function reduceStepStatus(prev: StepStatusCount, cur: Ping): StepStatusCount {
  if (cur.synthetics?.payload?.status === 'succeeded') {
    prev.succeeded += 1;
    return prev;
  } else if (cur.synthetics?.payload?.status === 'skipped') {
    prev.skipped += 1;
    return prev;
  }
  prev.failed += 1;
  return prev;
}

function isStepEnd(step: Ping) {
  return step.synthetics?.type === 'step/end';
}

interface ExecutedJourneyProps {
  journey: JourneyState;
}

export const ExecutedJourney: FC<ExecutedJourneyProps> = ({ journey }) => (
  <div>
    <EuiText>
      <h3>
        <FormattedMessage
          id="xpack.uptime.synthetics.executedJourney.heading"
          defaultMessage="Summary information"
        />
      </h3>
      <p>
        {statusMessage(
          journey.steps
            .filter(isStepEnd)
            .reduce(reduceStepStatus, { failed: 0, skipped: 0, succeeded: 0 })
        )}
      </p>
    </EuiText>
    <EuiSpacer />
    <EuiFlexGroup direction="column">
      {journey.steps.filter(isStepEnd).map((step, index) => (
        <ExecutedStep key={index} index={index} step={step} />
      ))}
      <EuiSpacer size="s" />
    </EuiFlexGroup>
  </div>
);
