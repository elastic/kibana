/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiText } from '@elastic/eui';
import { JourneyStep } from '../../../../../../common/runtime_types';

export const StepDurationText = ({ step }: { step: JourneyStep }) => {
  const stepDurationText = useMemo(() => {
    if (step.synthetics.step?.status === 'skipped') {
      return '-';
    }

    const microSecs = step.synthetics.step?.duration?.us ?? 0;
    const secs = microSecs / (1000 * 1000);
    if (secs >= 1) {
      return `${secs.toFixed(1)} s`;
    }

    return `${(microSecs / 1000).toFixed(0)} ms`;
  }, [step.synthetics.step?.duration.us, step.synthetics.step?.status]);

  return <EuiText size="s">{stepDurationText}</EuiText>;
};
