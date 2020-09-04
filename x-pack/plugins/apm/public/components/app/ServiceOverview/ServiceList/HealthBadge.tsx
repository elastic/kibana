/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  getSeverityColor,
  Severity,
} from '../../../../../common/anomaly_detection';
import { useTheme } from '../../../../hooks/useTheme';

export function HealthBadge({ severity }: { severity?: Severity }) {
  const theme = useTheme();

  let label: string = '';

  switch (severity) {
    case Severity.critical:
      label = i18n.translate(
        'xpack.apm.servicesTable.serviceHealthStatus.critical',
        {
          defaultMessage: 'Critical',
        }
      );
      break;

    case Severity.major:
    case Severity.minor:
      label = i18n.translate(
        'xpack.apm.servicesTable.serviceHealthStatus.warning',
        {
          defaultMessage: 'Warning',
        }
      );
      break;

    case Severity.warning:
      label = i18n.translate(
        'xpack.apm.servicesTable.serviceHealthStatus.healthy',
        {
          defaultMessage: 'Healthy',
        }
      );
      break;

    default:
      label = i18n.translate(
        'xpack.apm.servicesTable.serviceHealthStatus.unknown',
        {
          defaultMessage: 'Unknown',
        }
      );
      break;
  }

  const unknownColor = theme.eui.euiColorLightShade;

  return (
    <EuiBadge color={getSeverityColor(theme, severity) ?? unknownColor}>
      {label}
    </EuiBadge>
  );
}
