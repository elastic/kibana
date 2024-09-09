/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  ALERT_DURATION,
  ALERT_NAMESPACE,
  ALERT_RULE_NAME,
  ALERT_START,
  ALERT_STATUS,
  ML_ANOMALY_DETECTION_RULE_TYPE_ID,
} from '@kbn/rule-data-utils';
import type { JobsHealthTests } from '../types/alerts';

export const ML_ALERT_TYPES = {
  ANOMALY_DETECTION: ML_ANOMALY_DETECTION_RULE_TYPE_ID,
  AD_JOBS_HEALTH: 'xpack.ml.anomaly_detection_jobs_health',
} as const;

export type MlAlertType = (typeof ML_ALERT_TYPES)[keyof typeof ML_ALERT_TYPES];

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

const ML_ALERT_NAMESPACE = ALERT_NAMESPACE;

// Anomaly detection rule type fields
export const ALERT_ANOMALY_TIMESTAMP = `${ML_ALERT_NAMESPACE}.anomaly_timestamp` as const;
export const ALERT_ANOMALY_DETECTION_JOB_ID = `${ML_ALERT_NAMESPACE}.job_id` as const;
export const ALERT_ANOMALY_SCORE = `${ML_ALERT_NAMESPACE}.anomaly_score` as const;
export const ALERT_ANOMALY_IS_INTERIM = `${ML_ALERT_NAMESPACE}.is_interim` as const;
export const ALERT_TOP_RECORDS = `${ML_ALERT_NAMESPACE}.top_records` as const;
export const ALERT_TOP_INFLUENCERS = `${ML_ALERT_NAMESPACE}.top_influencers` as const;

// Anomaly detection health rule type fields
export const ALERT_MML_RESULTS = `${ML_ALERT_NAMESPACE}.mml_results` as const;
export const ALERT_DATAFEED_RESULTS = `${ML_ALERT_NAMESPACE}.datafeed_results` as const;
export const ALERT_DELAYED_DATA_RESULTS = `${ML_ALERT_NAMESPACE}.delayed_data_results` as const;
export const ALERT_JOB_ERRORS_RESULTS = `${ML_ALERT_NAMESPACE}.job_errors_results` as const;

export const alertFieldNameMap = Object.freeze<Record<string, string>>({
  [ALERT_RULE_NAME]: i18n.translate('xpack.ml.alertsTable.columns.ruleName', {
    defaultMessage: 'Rule name',
  }),
  [ALERT_STATUS]: i18n.translate('xpack.ml.alertsTable.columns.status', {
    defaultMessage: 'Status',
  }),
  [ALERT_ANOMALY_DETECTION_JOB_ID]: i18n.translate('xpack.ml.alertsTable.columns.jobId', {
    defaultMessage: 'Job ID',
  }),
  [ALERT_ANOMALY_SCORE]: i18n.translate('xpack.ml.alertsTable.columns.anomalyScore', {
    defaultMessage: 'Latest anomaly score',
  }),
  [ALERT_ANOMALY_TIMESTAMP]: i18n.translate('xpack.ml.alertsTable.columns.anomalyTime', {
    defaultMessage: 'Latest anomaly time',
  }),
  [ALERT_DURATION]: i18n.translate('xpack.ml.alertsTable.columns.duration', {
    defaultMessage: 'Duration',
  }),
  [ALERT_START]: i18n.translate('xpack.ml.alertsTable.columns.start', {
    defaultMessage: 'Start time',
  }),
});
