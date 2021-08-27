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

export const HEALTH_CHECK_NAMES: Record<JobsHealthTests, { name: string; description: string }> = {
  datafeed: {
    name: i18n.translate('xpack.ml.alertTypes.jobsHealthAlertingRule.datafeedCheckName', {
      defaultMessage: 'Datafeed is not started',
    }),
    description: i18n.translate(
      'xpack.ml.alertTypes.jobsHealthAlertingRule.datafeedCheckDescription',
      {
        defaultMessage: 'Get alerted if the corresponding datafeed of the job is not started',
      }
    ),
  },
  mml: {
    name: i18n.translate('xpack.ml.alertTypes.jobsHealthAlertingRule.mmlCheckName', {
      defaultMessage: 'Model memory limit reached',
    }),
    description: i18n.translate('xpack.ml.alertTypes.jobsHealthAlertingRule.mmlCheckDescription', {
      defaultMessage: 'Get alerted when job reaches soft or hard model memory limit.',
    }),
  },
  delayedData: {
    name: i18n.translate('xpack.ml.alertTypes.jobsHealthAlertingRule.delayedDataCheckName', {
      defaultMessage: 'Data delay has occurred',
    }),
    description: i18n.translate(
      'xpack.ml.alertTypes.jobsHealthAlertingRule.delayedDataCheckDescription',
      {
        defaultMessage: 'Get alerted if a job missed data due to data delay.',
      }
    ),
  },
  errorMessages: {
    name: i18n.translate('xpack.ml.alertTypes.jobsHealthAlertingRule.errorMessagesCheckName', {
      defaultMessage: 'Errors in job messages',
    }),
    description: i18n.translate(
      'xpack.ml.alertTypes.jobsHealthAlertingRule.errorMessagesCheckDescription',
      {
        defaultMessage: 'Get alerted if a job contains errors in the job messages.',
      }
    ),
  },
  behindRealtime: {
    name: i18n.translate('xpack.ml.alertTypes.jobsHealthAlertingRule.behindRealtimeCheckName', {
      defaultMessage: 'Job is running behind real-time',
    }),
    description: i18n.translate(
      'xpack.ml.alertTypes.jobsHealthAlertingRule.behindRealtimeCheckDescription',
      {
        defaultMessage: 'Job is running behind real-time',
      }
    ),
  },
};
