/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { KibanaRequest } from '@kbn/core/server';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import type {
  ByteSize,
  DateTime,
  MlDatafeedState,
  MlJobState,
  MlJobStats,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type {
  ActionGroup,
  AlertInstanceContext,
  AlertInstanceState,
  RecoveredActionGroupId,
  RuleTypeState,
} from '@kbn/alerting-plugin/common';
import type { RuleExecutorOptions, IRuleTypeAlerts } from '@kbn/alerting-plugin/server';
import { AlertsClientError } from '@kbn/alerting-plugin/server';
import type { MlAnomalyDetectionHealthAlert } from '@kbn/alerts-as-data-utils';
import type { ALERT_REASON } from '@kbn/rule-data-utils';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import {
  ALERT_DATAFEED_RESULTS,
  ALERT_DELAYED_DATA_RESULTS,
  ALERT_JOB_ERRORS_RESULTS,
  ALERT_MML_RESULTS,
  ML_ALERT_TYPES,
} from '../../../common/constants/alerts';
import { PLUGIN_ID } from '../../../common/constants/app';
import { MINIMUM_FULL_LICENSE } from '../../../common/license';
import {
  anomalyDetectionJobsHealthRuleParams,
  type AnomalyDetectionJobsHealthRuleParams,
} from '../../routes/schemas/alerting_schema';
import type { RegisterAlertParams } from './register_ml_alerts';
import type { JobMessage } from '../../../common/types/audit_message';

type ModelSizeStats = MlJobStats['model_size_stats'];

export interface MmlTestResponse {
  job_id: string;
  memory_status: ModelSizeStats['memory_status'];
  log_time: string;
  model_bytes: string;
  model_bytes_memory_limit: string;
  peak_model_bytes: string;
  model_bytes_exceeded: string;
}

export interface MmlTestPayloadResponse {
  job_id: string;
  memory_status: ModelSizeStats['memory_status'];
  log_time: ModelSizeStats['log_time'];
  model_bytes: ByteSize;
  model_bytes_memory_limit: ByteSize;
  peak_model_bytes: ByteSize;
  model_bytes_exceeded: ByteSize;
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

export interface DelayedDataPayloadResponse {
  job_id: string;
  /** Annotation string */
  annotation: string;
  /** Number of missed documents */
  missed_docs_count: number;
  end_timestamp: DateTime;
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

export type AnomalyDetectionJobHealthAlertPayload = {
  [ALERT_REASON]: string;
} & (
  | { [ALERT_MML_RESULTS]: MmlTestPayloadResponse[] }
  | { [ALERT_DATAFEED_RESULTS]: NotStartedDatafeedResponse[] }
  | { [ALERT_DELAYED_DATA_RESULTS]: DelayedDataPayloadResponse[] }
  | { [ALERT_JOB_ERRORS_RESULTS]: JobsErrorsResponse[] }
);

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
  AnomalyDetectionJobRealtimeIssue,
  MlAnomalyDetectionHealthAlert
>;

export const ANOMALY_DETECTION_HEALTH_AAD_INDEX_NAME = 'ml.anomaly-detection-health';

export const ANOMALY_DETECTION_HEALTH_AAD_CONFIG: IRuleTypeAlerts<MlAnomalyDetectionHealthAlert> = {
  context: ANOMALY_DETECTION_HEALTH_AAD_INDEX_NAME,
  mappings: {
    fieldMap: {
      [ALERT_MML_RESULTS]: {
        type: ES_FIELD_TYPES.OBJECT,
        array: true,
        required: false,
        dynamic: false,
        properties: {
          job_id: { type: ES_FIELD_TYPES.KEYWORD },
          memory_status: { type: ES_FIELD_TYPES.KEYWORD },
          log_time: { type: ES_FIELD_TYPES.DATE },
          model_bytes: { type: ES_FIELD_TYPES.LONG },
          model_bytes_memory_limit: { type: ES_FIELD_TYPES.LONG },
          peak_model_bytes: { type: ES_FIELD_TYPES.LONG },
          model_bytes_exceeded: { type: ES_FIELD_TYPES.LONG },
        },
      },
      [ALERT_DATAFEED_RESULTS]: {
        type: ES_FIELD_TYPES.OBJECT,
        array: true,
        required: false,
        dynamic: false,
        properties: {
          job_id: { type: ES_FIELD_TYPES.KEYWORD },
          job_state: { type: ES_FIELD_TYPES.KEYWORD },
          datafeed_id: { type: ES_FIELD_TYPES.KEYWORD },
          datafeed_state: { type: ES_FIELD_TYPES.KEYWORD },
        },
      },
      [ALERT_DELAYED_DATA_RESULTS]: {
        type: ES_FIELD_TYPES.OBJECT,
        array: true,
        required: false,
        dynamic: false,
        properties: {
          job_id: { type: ES_FIELD_TYPES.KEYWORD },
          annotation: { type: ES_FIELD_TYPES.TEXT },
          missed_docs_count: { type: ES_FIELD_TYPES.LONG },
          end_timestamp: { type: ES_FIELD_TYPES.DATE },
        },
      },
      [ALERT_JOB_ERRORS_RESULTS]: {
        type: ES_FIELD_TYPES.OBJECT,
        array: true,
        required: false,
        dynamic: false,
        properties: {
          job_id: { type: ES_FIELD_TYPES.KEYWORD },
          errors: { type: ES_FIELD_TYPES.OBJECT },
        },
      },
    },
  },
  shouldWrite: true,
};

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
    AnomalyDetectionJobRealtimeIssue,
    RecoveredActionGroupId,
    MlAnomalyDetectionHealthAlert
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
    schemas: {
      params: {
        type: 'config-schema',
        schema: anomalyDetectionJobsHealthRuleParams,
      },
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
    category: DEFAULT_APP_CATEGORIES.management.id,
    producer: PLUGIN_ID,
    minimumLicenseRequired: MINIMUM_FULL_LICENSE,
    isExportable: true,
    doesSetRecoveryContext: true,
    alerts: ANOMALY_DETECTION_HEALTH_AAD_CONFIG,
    async executor(options) {
      const {
        services,
        rule: { name },
      } = options;

      const { alertsClient } = services;

      if (!alertsClient) {
        throw new AlertsClientError();
      }

      const fakeRequest = {} as KibanaRequest;
      const { getTestsResults } = mlServicesProviders.jobsHealthServiceProvider(
        services.savedObjectsClient,
        fakeRequest,
        logger
      );
      const executionResult = await getTestsResults(options);

      const unhealthyTests = executionResult.filter(({ isHealthy }) => !isHealthy);

      if (unhealthyTests.length > 0) {
        logger.debug(
          `"${name}" rule is scheduling actions for tests: ${unhealthyTests
            .map((v) => v.name)
            .join(', ')}`
        );

        unhealthyTests.forEach(({ name: alertName, context, payload }) => {
          alertsClient.report({
            id: alertName,
            actionGroup: ANOMALY_DETECTION_JOB_REALTIME_ISSUE,
            context,
            payload,
          });
        });
      }

      // Set context for recovered alerts
      for (const recoveredAlert of alertsClient.getRecoveredAlerts()) {
        const recoveredAlertId = recoveredAlert.alert.getId();
        const testResult = executionResult.find((v) => v.name === recoveredAlertId);
        if (testResult) {
          alertsClient.setAlertData({
            id: recoveredAlertId,
            context: testResult.context,
            payload: testResult.payload,
          });
        }
      }

      return { state: {} };
    },
  });
}
