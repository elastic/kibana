/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { JobsHealthTests } from '../types/alerts';

export const ML_ALERT_TYPES = {
  ANOMALY_DETECTION: 'xpack.ml.anomaly_detection_alert',
  AD_JOBS_HEALTH: 'xpack.ml.anomaly_detection_jobs_health',
} as const;

export type MlAlertType = typeof ML_ALERT_TYPES[keyof typeof ML_ALERT_TYPES];

export const ALERT_PREVIEW_SAMPLE_SIZE = 5;

export const TOP_N_BUCKETS_COUNT = 1;

export const ALL_JOBS_SELECTION = '*';

export const HEALTH_CHECK_NAMES: Record<JobsHealthTests, string> = {
  datafeed: i18n.translate('xpack.ml.alertTypes.jobsHealthAlertingRule.datafeedCheckName', {
    defaultMessage: 'Datafeed is not started',
  }),
  mml: i18n.translate('xpack.ml.alertTypes.jobsHealthAlertingRule.mmlCheckName', {
    defaultMessage: 'Model memory limit',
  }),
  errorMessages: i18n.translate(
    'xpack.ml.alertTypes.jobsHealthAlertingRule.errorMessagesCheckName',
    {
      defaultMessage: 'There are errors in job messages',
    }
  ),
  behindRealtime: i18n.translate(
    'xpack.ml.alertTypes.jobsHealthAlertingRule.behindRealtimeCheckName',
    {
      defaultMessage: 'Job is running behind real-time',
    }
  ),
  delayedData: i18n.translate('xpack.ml.alertTypes.jobsHealthAlertingRule.delayedDataCheckName', {
    defaultMessage: 'Delayed data has occurred',
  }),
};
