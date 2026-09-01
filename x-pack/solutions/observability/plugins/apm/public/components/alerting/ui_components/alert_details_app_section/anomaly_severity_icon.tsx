/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import type { SerializedStyles } from '@emotion/react';
import type { IconType } from '@elastic/eui';
import { EuiIcon } from '@elastic/eui';
import { ML_ANOMALY_SEVERITY } from '@kbn/ml-anomaly-utils/anomaly_severity';

const rotateIconUpCss = css`
  transform: rotate(-90deg);
`;

export interface AnomalySeverityIconConfig {
  iconType: IconType;
  css?: SerializedStyles;
}

export function getAnomalySeverityIconType(
  severity: ML_ANOMALY_SEVERITY
): AnomalySeverityIconConfig {
  switch (severity) {
    case ML_ANOMALY_SEVERITY.LOW:
      return { iconType: 'info' };
    case ML_ANOMALY_SEVERITY.WARNING:
      return { iconType: 'chevronSingleUp' };
    case ML_ANOMALY_SEVERITY.MINOR:
      return { iconType: 'chevronDoubleRight', css: rotateIconUpCss };
    case ML_ANOMALY_SEVERITY.MAJOR:
      return { iconType: 'warning' };
    case ML_ANOMALY_SEVERITY.CRITICAL:
      return { iconType: 'crossCircle' };
    case ML_ANOMALY_SEVERITY.UNKNOWN:
      return { iconType: 'question' };
    default:
      return { iconType: 'info' };
  }
}

export function AnomalySeverityIcon({ severity }: { severity: ML_ANOMALY_SEVERITY }) {
  const { iconType, css: iconCss } = getAnomalySeverityIconType(severity);

  return (
    <EuiIcon
      type={iconType}
      css={iconCss}
      size="m"
      color="inherit"
      aria-hidden={true}
      data-test-subj={`apmAlertDetailsAnomalySeverityIcon-${severity}`}
    />
  );
}
