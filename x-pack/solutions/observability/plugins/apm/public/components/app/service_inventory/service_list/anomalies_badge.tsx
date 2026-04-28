/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiBadge, EuiHealth, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ML_ANOMALY_SEVERITY } from '@kbn/ml-anomaly-utils/anomaly_severity';
import { getSeverity, getSeverityColor } from '../../../../../common/anomaly_detection';

function getI18nLabel(severity: ML_ANOMALY_SEVERITY): string {
  switch (severity) {
    case ML_ANOMALY_SEVERITY.CRITICAL:
      return i18n.translate('xpack.apm.anomaliesBadge.label.critical', {
        defaultMessage: 'Critical',
      });
    case ML_ANOMALY_SEVERITY.MAJOR:
      return i18n.translate('xpack.apm.anomaliesBadge.label.major', {
        defaultMessage: 'Major',
      });
    case ML_ANOMALY_SEVERITY.MINOR:
      return i18n.translate('xpack.apm.anomaliesBadge.label.minor', {
        defaultMessage: 'Minor',
      });
    case ML_ANOMALY_SEVERITY.WARNING:
      return i18n.translate('xpack.apm.anomaliesBadge.label.warning', {
        defaultMessage: 'Warning',
      });
    case ML_ANOMALY_SEVERITY.LOW:
      return i18n.translate('xpack.apm.anomaliesBadge.label.low', {
        defaultMessage: 'Low',
      });
    case ML_ANOMALY_SEVERITY.UNKNOWN:
      return i18n.translate('xpack.apm.anomaliesBadge.label.unknown', {
        defaultMessage: 'Unknown',
      });
  }
}

function formatLabelWithScore(label: string, score?: number): string {
  if (score === undefined) return label;
  return `${label} (${Math.round(score)})`;
}

export function AnomaliesBadge({ score }: { score?: number }) {
  const severity = useMemo(() => getSeverity(score), [score]);
  const text = formatLabelWithScore(getI18nLabel(severity), score);

  const tooltipContent =
    score === undefined
      ? i18n.translate('xpack.apm.anomaliesBadge.tooltip.unknown', {
          defaultMessage: 'No anomaly score is available for the selected time range.',
        })
      : i18n.translate('xpack.apm.anomaliesBadge.tooltip.score', {
          defaultMessage: 'Anomaly score (max.): {score}',
          values: { score: score.toFixed(2) },
        });

  return (
    <EuiToolTip position="bottom" content={tooltipContent}>
      <EuiBadge tabIndex={0} color="hollow" style={{ alignItems: 'center' }}>
        <EuiHealth
          textSize="inherit"
          color={score === undefined ? 'subdued' : getSeverityColor(score)}
          style={{ lineHeight: 'inherit', display: 'flex', alignItems: 'center' }}
        >
          {text}
        </EuiHealth>
      </EuiBadge>
    </EuiToolTip>
  );
}
