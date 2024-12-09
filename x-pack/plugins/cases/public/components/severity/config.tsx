/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useEuiTheme, EuiHealth } from '@elastic/eui';
import { CaseSeverity } from '../../../common/types/domain';
import { CRITICAL, HIGH, LOW, MEDIUM } from './translations';

interface Props {
  severity: 'low' | 'medium' | 'high' | 'critical';
  label: string;
}

export const severities = {
  [CaseSeverity.LOW]: {
    label: LOW,
  },
  [CaseSeverity.MEDIUM]: {
    label: MEDIUM,
  },
  [CaseSeverity.HIGH]: {
    label: HIGH,
  },
  [CaseSeverity.CRITICAL]: {
    label: CRITICAL,
  },
};

// eslint-disable-next-line react/display-name
export const SeverityHealth: React.FC<Props> = ({ severity, label }) => {
  const { euiTheme } = useEuiTheme();

  const severityColors = {
    low: euiTheme.colors.vis.euiColorVis0,
    medium: euiTheme.colors.vis.euiColorVis5,
    high: euiTheme.colors.vis.euiColorVis7,
    critical: euiTheme.colors.vis.euiColorVis9,
  };

  const color = severityColors[severity];

  return <EuiHealth color={color}>{label}</EuiHealth>;
};
