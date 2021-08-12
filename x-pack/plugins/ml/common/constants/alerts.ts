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

export const HEALTH_CHECK_NAMES: Record<
  JobsHealthTests,
  { id: string; name: string; description: string }
> = {
  datafeed: {
    id: 'datafeed_not_started',
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
    id: 'mml',
    name: i18n.translate('xpack.ml.alertTypes.jobsHealthAlertingRule.mmlCheckName', {
      defaultMessage: 'Model memory limit reached',
    }),
    description: i18n.translate('xpack.ml.alertTypes.jobsHealthAlertingRule.mmlCheckDescription', {
      defaultMessage: 'Get alerted when job reaches soft or hard model memory limit.',
    }),
  },
  delayedData: {
    id: 'delayed_data',
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
    id: 'error_messages',
    name: i18n.translate('xpack.ml.alertTypes.jobsHealthAlertingRule.errorMessagesCheckName', {
      defaultMessage: 'There are errors in the job messages',
    }),
    description: i18n.translate(
      'xpack.ml.alertTypes.jobsHealthAlertingRule.errorMessagesCheckDescription',
      {
        defaultMessage: 'There are errors in the job messages',
      }
    ),
  },
  behindRealtime: {
    id: 'behind_realtime',
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

const ML_NAMESPACE = 'ml' as const;

export const JOB_ID = `${ML_NAMESPACE}.job_id` as const;
export const JOB_STATE = `${ML_NAMESPACE}.job_state` as const;
export const DATAFEED_ID = `${ML_NAMESPACE}.datafeed_id` as const;
export const DATAFEED_STATE = `${ML_NAMESPACE}.datafeed_state` as const;
export const MEMORY_STATUS = `${ML_NAMESPACE}.memory_status` as const;
export const MEMORY_LOG_TIME = `${ML_NAMESPACE}.memory_log_time` as const;
export const MODEL_BYTES = `${ML_NAMESPACE}.model_bytes` as const;
export const MODEL_BYTES_MEMORY_LIMIT = `${ML_NAMESPACE}.model_bytes_memory_limit` as const;
export const PEAK_MODEL_BYTES = `${ML_NAMESPACE}.peak_model_bytes` as const;
export const MODEL_BYTES_EXCEEDED = `${ML_NAMESPACE}.model_bytes_exceeded` as const;
export const ANNOTATION = `${ML_NAMESPACE}.annotation` as const;
export const MISSED_DOC_COUNT = `${ML_NAMESPACE}.missed_docs_count` as const;
export const END_TIMESTAMP = `${ML_NAMESPACE}.end_timestamp` as const;
