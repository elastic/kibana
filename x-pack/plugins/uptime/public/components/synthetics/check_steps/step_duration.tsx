/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { EuiButtonEmpty, EuiPopover } from '@elastic/eui';
import { useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import numeral from '@elastic/numeral';
import { JourneyStep } from '../../../../common/runtime_types';
import { StepFieldTrend } from './step_field_trend';
import { microToSec } from '../../../lib/formatting';

interface Props {
  step: JourneyStep;
}

export const StepDuration = ({ step }: Props) => {
  const [isOpen, setIsOpen] = useState(false);

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
    <EuiButtonEmpty onMouseEnter={() => setIsOpen(true)} iconType="visArea">
      {i18n.translate('xpack.uptime.synthetics.step.duration', {
        defaultMessage: '{value} seconds',
        values: {
          value: numeral(microToSec(step.synthetics.step?.duration.us!)).format('00.0'),
        },
      })}
    </EuiButtonEmpty>
  );

  return (
    <EuiPopover
      isOpen={isOpen}
      button={button}
      closePopover={() => setIsOpen(false)}
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
