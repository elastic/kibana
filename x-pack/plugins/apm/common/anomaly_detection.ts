/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export interface ServiceAnomalyStats {
  transactionType?: string;
  anomalyScore?: number;
  actualValue?: number;
  jobId?: string;
}

export const MLErrorMessages: Record<ErrorCode, string> = {
  INSUFFICIENT_LICENSE: i18n.translate(
    'xpack.apm.anomaly_detection.error.insufficient_license',
    {
      defaultMessage:
        'You must have a platinum license to use Anomaly Detection',
    }
  ),
  MISSING_READ_PRIVILEGES: i18n.translate(
    'xpack.apm.anomaly_detection.error.missing_read_privileges',
    {
      defaultMessage:
        'You must have "read" privileges to Machine Learning in order to view Anomaly Detection jobs',
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
  UNEXPECTED: i18n.translate('xpack.apm.anomaly_detection.error.unexpected', {
    defaultMessage: 'An unexpected error occurred',
  }),
};

export enum ErrorCode {
  INSUFFICIENT_LICENSE = 'INSUFFICIENT_LICENSE',
  MISSING_READ_PRIVILEGES = 'MISSING_READ_PRIVILEGES',
  MISSING_WRITE_PRIVILEGES = 'MISSING_WRITE_PRIVILEGES',
  ML_NOT_AVAILABLE = 'ML_NOT_AVAILABLE',
  ML_NOT_AVAILABLE_IN_SPACE = 'ML_NOT_AVAILABLE_IN_SPACE',
  UNEXPECTED = 'UNEXPECTED',
}
