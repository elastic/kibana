/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { KibanaRequest } from '@kbn/core/server';
import {
  MlDatafeedState,
  MlJobState,
  MlJobStats,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  ActionGroup,
  AlertInstanceContext,
  AlertInstanceState,
  RuleTypeState,
} from '@kbn/alerting-plugin/common';
import type { RuleExecutorOptions } from '@kbn/alerting-plugin/server';
import { ML_ALERT_TYPES } from '../../../common/constants/alerts';
import { PLUGIN_ID } from '../../../common/constants/app';
import { MINIMUM_FULL_LICENSE } from '../../../common/license';
import {
  anomalyDetectionJobsHealthRuleParams,
  AnomalyDetectionJobsHealthRuleParams,
} from '../../routes/schemas/alerting_schema';
import { RegisterAlertParams } from './register_ml_alerts';
import type { JobMessage } from '../../../common/types/audit_message';

type ModelSizeStats = MlJobStats['model_size_stats'];

export interface MmlTestResponse {
  job_id: string;
  memory_status: ModelSizeStats['memory_status'];
  log_time: ModelSizeStats['log_time'];
  model_bytes: string;
  model_bytes_memory_limit: string;
  peak_model_bytes: string;
  model_bytes_exceeded: string;
}

export interface NotStartedDatafeedResponse {
  datafeed_id: string;
  datafeed_state: MlDatafeedState;
  job_id: string;
  job_state: MlJobState;
}

export interface DelayedDataResponse {
  job_id: string;
  /** Annotation string */
  annotation: string;
  /** Number of missed documents */
  missed_docs_count: number;
  /** Timestamp of the latest finalized bucket with missing docs */
  end_timestamp: string;
}

export interface JobsErrorsResponse {
  job_id: string;
  errors: Array<Omit<JobMessage, 'timestamp'> & { timestamp: string }>;
}

export type AnomalyDetectionJobHealthResult =
  | MmlTestResponse
  | NotStartedDatafeedResponse
  | DelayedDataResponse
  | JobsErrorsResponse;

export type AnomalyDetectionJobsHealthAlertContext = {
  results: AnomalyDetectionJobHealthResult[];
  message: string;
} & AlertInstanceContext;

export const ANOMALY_DETECTION_JOB_REALTIME_ISSUE = 'anomaly_detection_realtime_issue';

export type AnomalyDetectionJobRealtimeIssue = typeof ANOMALY_DETECTION_JOB_REALTIME_ISSUE;

export const REALTIME_ISSUE_DETECTED: ActionGroup<AnomalyDetectionJobRealtimeIssue> = {
  id: ANOMALY_DETECTION_JOB_REALTIME_ISSUE,
  name: i18n.translate('xpack.ml.jobsHealthAlertingRule.actionGroupName', {
    defaultMessage: 'Issue detected',
  }),
};

export type JobsHealthExecutorOptions = RuleExecutorOptions<
  AnomalyDetectionJobsHealthRuleParams,
  Record<string, unknown>,
  Record<string, unknown>,
  AnomalyDetectionJobsHealthAlertContext,
  AnomalyDetectionJobRealtimeIssue
>;

export function registerJobsMonitoringRuleType({
  alerting,
  mlServicesProviders,
  logger,
}: RegisterAlertParams) {
  alerting.registerType<
    AnomalyDetectionJobsHealthRuleParams,
    never, // Only use if defining useSavedObjectReferences hook
    RuleTypeState,
    AlertInstanceState,
    AnomalyDetectionJobsHealthAlertContext,
    AnomalyDetectionJobRealtimeIssue
  >({
    id: ML_ALERT_TYPES.AD_JOBS_HEALTH,
    name: i18n.translate('xpack.ml.jobsHealthAlertingRule.name', {
      defaultMessage: 'Anomaly detection jobs health',
    }),
    actionGroups: [REALTIME_ISSUE_DETECTED],
    defaultActionGroupId: ANOMALY_DETECTION_JOB_REALTIME_ISSUE,
    validate: {
      params: anomalyDetectionJobsHealthRuleParams,
    },
    actionVariables: {
      context: [
        {
          name: 'results',
          description: i18n.translate(
            'xpack.ml.alertTypes.jobsHealthAlertingRule.alertContext.resultsDescription',
            {
              defaultMessage: 'Results of the rule execution',
            }
          ),
        },
        {
          name: 'message',
          description: i18n.translate(
            'xpack.ml.alertTypes.jobsHealthAlertingRule.alertContext.messageDescription',
            {
              defaultMessage: 'Alert info message',
            }
          ),
        },
      ],
    },
    producer: PLUGIN_ID,
    minimumLicenseRequired: MINIMUM_FULL_LICENSE,
    isExportable: true,
    async executor(options) {
      const { services, name } = options;

      const fakeRequest = {} as KibanaRequest;
      const { getTestsResults } = mlServicesProviders.jobsHealthServiceProvider(
        services.savedObjectsClient,
        fakeRequest,
        logger
      );
      const executionResult = await getTestsResults(options);

      if (executionResult.length > 0) {
        logger.debug(
          `"${name}" rule is scheduling actions for tests: ${executionResult
            .map((v) => v.name)
            .join(', ')}`
        );

        executionResult.forEach(({ name: alertInstanceName, context }) => {
          const alertInstance = services.alertFactory.create(alertInstanceName);
          alertInstance.scheduleActions(ANOMALY_DETECTION_JOB_REALTIME_ISSUE, context);
        });
      }
    },
  });
}
