/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiBadge, useEuiTheme } from '@elastic/eui';
import type { ML_ANOMALY_SEVERITY } from '@kbn/ml-anomaly-utils/anomaly_severity';
import { useSeverityColor } from '@kbn/ml-anomaly-utils';
import { formatSeverityLabel } from './helpers';
import { AnomalySeverityIcon } from './anomaly_severity_icon';

export interface AnomalyChartInfo {
  severity: ML_ANOMALY_SEVERITY;
  score: number;
}

export type AnomalySeverityBadgeProps = AnomalyChartInfo;

export function AnomalySeverityBadge({ severity, score }: AnomalySeverityBadgeProps) {
  const color = useSeverityColor(score);
  const { euiTheme } = useEuiTheme();

  const badgeContentCss = css({
    display: 'inline-flex',
    alignItems: 'center',
    verticalAlign: 'middle',
    gap: `${euiTheme.size.xs}`,
  });

  return (
    <EuiBadge color={color} data-test-subj="apmAlertDetailsAnomalySeverityBadge">
      <span css={badgeContentCss}>
        <AnomalySeverityIcon severity={severity} />
        {formatSeverityLabel(severity)}
      </span>
    </EuiBadge>
  );
}
