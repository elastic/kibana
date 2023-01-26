/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { CSSProperties, useMemo } from 'react';
import { EuiText, useEuiTheme } from '@elastic/eui';
import { JourneyStep } from '../../../../../../common/runtime_types';
import { formatTestDuration } from '../../../utils/monitor_test_result/test_time_formats';

import { parseBadgeStatus, getTextColorForMonitorStatus } from './status_badge';

export const StepDurationText = ({ step }: { step: JourneyStep }) => {
  const { euiTheme } = useEuiTheme();

  const stepDuration = useMemo(() => {
    const status = parseBadgeStatus(step.synthetics.step?.status ?? '');
    const color = euiTheme.colors[getTextColorForMonitorStatus(status)] as CSSProperties['color'];
    if (status === 'skipped') {
      return { text: '-', color };
    }

    return {
      text: formatTestDuration(step.synthetics.step?.duration?.us),
      color,
    };
  }, [euiTheme.colors, step.synthetics.step?.duration?.us, step.synthetics.step?.status]);

  return (
    <EuiText size="s" color={stepDuration.color}>
      {stepDuration.text}
    </EuiText>
  );
};
