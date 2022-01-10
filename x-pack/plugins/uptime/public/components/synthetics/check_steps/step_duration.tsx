/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MouseEvent } from 'react';

import * as React from 'react';
import { EuiButtonEmpty, EuiPopover } from '@elastic/eui';
import { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { JourneyStep } from '../../../../common/runtime_types';
import { StepFieldTrend } from './step_field_trend';
import { microToSec } from '../../../lib/formatting';

interface Props {
  compactView?: boolean;
  step: JourneyStep;
  durationPopoverOpenIndex: number | null;
  setDurationPopoverOpenIndex: (val: number | null) => void;
}

export const StepDuration = ({
  step,
  durationPopoverOpenIndex,
  setDurationPopoverOpenIndex,
  compactView = false,
}: Props) => {
  const component = useMemo(
    () => (
      <StepFieldTrend
        step={step}
        field={'synthetics.step.duration.us'}
        title={STEP_DURATION_TREND}
      />
    ),
    [step]
  );

  if (step.synthetics.step?.status === 'skipped') {
    return <span>--</span>;
  }

  const button = (
    <EuiButtonEmpty
      onMouseEnter={() => setDurationPopoverOpenIndex(step.synthetics.step?.index ?? null)}
      iconType={compactView ? undefined : 'visArea'}
    >
      {i18n.translate('xpack.uptime.synthetics.step.duration', {
        defaultMessage: '{value} seconds',
        values: {
          value: microToSec(step.synthetics.step?.duration.us!, 1),
        },
      })}
    </EuiButtonEmpty>
  );

  return (
    <EuiPopover
      onClick={(evt: MouseEvent<HTMLDivElement>) => evt.stopPropagation()}
      isOpen={durationPopoverOpenIndex === step.synthetics.step?.index}
      button={button}
      closePopover={() => setDurationPopoverOpenIndex(null)}
      zIndex={100}
      ownFocus={false}
    >
      {component}
    </EuiPopover>
  );
};

const STEP_DURATION_TREND = i18n.translate('xpack.uptime.synthetics.step.durationTrend', {
  defaultMessage: 'Step duration trend',
});
