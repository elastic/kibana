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
  severity: CaseSeverity;
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

export const SeverityHealth: React.FC<Props> = ({ severity }) => {
  const { euiTheme } = useEuiTheme();
  const { hasVisColorAdjustment } = euiTheme;

  const severityData = {
    low: {
      color: hasVisColorAdjustment
        ? euiTheme.colors.vis.euiColorVis0
        : euiTheme.colors.vis.euiColorVisSuccess0,
      label: LOW,
    },
    medium: {
      color: hasVisColorAdjustment
        ? euiTheme.colors.vis.euiColorVis5
        : euiTheme.colors.vis.euiColorVisWarning0,
      label: MEDIUM,
    },
    high: {
      color: hasVisColorAdjustment
        ? euiTheme.colors.vis.euiColorVis7
        : euiTheme.colors.vis.euiColorVisDanger1,
      label: HIGH,
    },
    critical: {
      color: hasVisColorAdjustment
        ? euiTheme.colors.vis.euiColorVis9
        : euiTheme.colors.vis.euiColorVisDanger0,
      label: CRITICAL,
    },
  };

  const { color, label } = severityData[severity];

  return <EuiHealth color={color}>{label}</EuiHealth>;
};
SeverityHealth.displayName = 'SeverityHealth';
