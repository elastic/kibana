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

  const severityData = {
    low: {
      color: euiTheme.flags.hasVisColorAdjustment ? '#54B399' : '#CAD3E2',
      label: LOW,
    },
    medium: {
      color: euiTheme.flags.hasVisColorAdjustment ? '#D6BF57' : '#FCD883',
      label: MEDIUM,
    },
    high: {
      color: euiTheme.flags.hasVisColorAdjustment ? '#DA8B45' : '#FC9188',
      label: HIGH,
    },
    critical: {
      color: euiTheme.flags.hasVisColorAdjustment ? '#E7664C' : '#C61E25',
      label: CRITICAL,
    },
  };

  const { color, label } = severityData[severity];

  return <EuiHealth color={color}>{label}</EuiHealth>;
};
SeverityHealth.displayName = 'SeverityHealth';
