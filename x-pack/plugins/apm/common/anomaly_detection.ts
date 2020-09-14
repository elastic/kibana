/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { EuiTheme } from '../../../legacy/common/eui_styled_components';

export interface ServiceAnomalyStats {
  transactionType?: string;
  anomalyScore?: number;
  actualValue?: number;
  jobId?: string;
}

export enum Severity {
  critical = 'critical',
  major = 'major',
  minor = 'minor',
  warning = 'warning',
}

// TODO: Replace with `getSeverity` from:
// https://github.com/elastic/kibana/blob/0f964f66916480f2de1f4b633e5afafc08cf62a0/x-pack/plugins/ml/common/util/anomaly_utils.ts#L129
export function getSeverity(score?: number) {
  if (typeof score !== 'number') {
    return undefined;
  } else if (score < 25) {
    return Severity.warning;
  } else if (score >= 25 && score < 50) {
    return Severity.minor;
  } else if (score >= 50 && score < 75) {
    return Severity.major;
  } else if (score >= 75) {
    return Severity.critical;
  } else {
    return undefined;
  }
}

export function getSeverityColor(theme: EuiTheme, severity?: Severity) {
  switch (severity) {
    case Severity.warning:
      return theme.eui.euiColorVis0;
    case Severity.minor:
    case Severity.major:
      return theme.eui.euiColorVis5;
    case Severity.critical:
      return theme.eui.euiColorVis9;
    default:
      return;
  }
}

export function getSeverityLabel(severity?: Severity) {
  switch (severity) {
    case Severity.critical:
      return i18n.translate(
        'xpack.apm.servicesTable.serviceHealthStatus.critical',
        {
          defaultMessage: 'Critical',
        }
      );

    case Severity.major:
    case Severity.minor:
      return i18n.translate(
        'xpack.apm.servicesTable.serviceHealthStatus.warning',
        {
          defaultMessage: 'Warning',
        }
      );

    case Severity.warning:
      return i18n.translate(
        'xpack.apm.servicesTable.serviceHealthStatus.healthy',
        {
          defaultMessage: 'Healthy',
        }
      );

    default:
      return i18n.translate(
        'xpack.apm.servicesTable.serviceHealthStatus.unknown',
        {
          defaultMessage: 'Unknown',
        }
      );
  }
}

export const ML_ERRORS = {
  INVALID_LICENSE: i18n.translate(
    'xpack.apm.anomaly_detection.error.invalid_license',
    {
      defaultMessage: `To use anomaly detection, you must be subscribed to an Elastic Platinum license. With it, you'll be able to monitor your services with the aid of machine learning.`,
    }
  ),
  MISSING_READ_PRIVILEGES: i18n.translate(
    'xpack.apm.anomaly_detection.error.missing_read_privileges',
    {
      defaultMessage:
        'You must have "read" privileges to Machine Learning and APM in order to view Anomaly Detection jobs',
    }
  ),
  MISSING_WRITE_PRIVILEGES: i18n.translate(
    'xpack.apm.anomaly_detection.error.missing_write_privileges',
    {
      defaultMessage:
        'You must have "write" privileges to Machine Learning and APM in order to create Anomaly Detection jobs',
    }
  ),
  ML_NOT_AVAILABLE: i18n.translate(
    'xpack.apm.anomaly_detection.error.not_available',
    {
      defaultMessage: 'Machine learning is not available',
    }
  ),
  ML_NOT_AVAILABLE_IN_SPACE: i18n.translate(
    'xpack.apm.anomaly_detection.error.not_available_in_space',
    {
      defaultMessage: 'Machine learning is not available in the selected space',
    }
  ),
};
