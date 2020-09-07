/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiBadge } from '@elastic/eui';
import {
  getSeverityColor,
  getSeverityLabel,
  Severity,
} from '../../../../../common/anomaly_detection';
import { useTheme } from '../../../../hooks/useTheme';

export function HealthBadge({ severity }: { severity?: Severity }) {
  const theme = useTheme();

  const unknownColor = theme.eui.euiColorLightShade;

  return (
    <EuiBadge color={getSeverityColor(theme, severity) ?? unknownColor}>
      {getSeverityLabel(severity)}
    </EuiBadge>
  );
}
