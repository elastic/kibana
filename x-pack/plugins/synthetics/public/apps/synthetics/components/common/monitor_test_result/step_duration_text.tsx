/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiText } from '@elastic/eui';
import { JourneyStep } from '../../../../../../common/runtime_types';
import { formatTestDuration } from '../../../utils/monitor_test_result/test_duration';

export const StepDurationText = ({ step }: { step: JourneyStep }) => {
  const stepDurationText = useMemo(() => {
    if (step.synthetics.step?.status === 'skipped') {
      return '-';
    }

    return formatTestDuration(step.synthetics.step?.duration?.us);
  }, [step.synthetics.step?.duration.us, step.synthetics.step?.status]);

  return <EuiText size="s">{stepDurationText}</EuiText>;
};
