/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { EuiButtonEmpty, EuiPopover } from '@elastic/eui';
import { useState } from 'react';
import { JourneyStep } from '../../../../common/runtime_types';
import { StepFieldTrend } from './waterfall_marker_trend';

interface Props {
  step: JourneyStep;
}

export const StepDuration = ({ step }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const button = (
    <EuiButtonEmpty onClick={() => setIsOpen((prevState) => !prevState)} iconType="visArea">
      {step.synthetics.step?.duration.us! / 1000} ms
    </EuiButtonEmpty>
  );
  return (
    <EuiPopover isOpen={isOpen} button={button} closePopover={() => setIsOpen(false)} zIndex={100}>
      <StepFieldTrend
        step={step}
        field={'synthetics.step.duration.us'}
        title={'Step duration trend'}
      />
    </EuiPopover>
  );
};
