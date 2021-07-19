/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { KibanaRequest } from 'kibana/server';
import { ML_ALERT_TYPES } from '../../../common/constants/alerts';
import { PLUGIN_ID } from '../../../common/constants/app';
import { MINIMUM_FULL_LICENSE } from '../../../common/license';
import {
  anomalyDetectionJobsHealthRuleParams,
  AnomalyDetectionJobsHealthRuleParams,
} from '../../routes/schemas/alerting_schema';
import { RegisterAlertParams } from './register_ml_alerts';
import {
  ActionGroup,
  AlertInstanceContext,
  AlertInstanceState,
  AlertTypeState,
} from '../../../../alerting/common';

export type AnomalyDetectionJobsHealthAlertContext = {
  jobIds: string[];
} & AlertInstanceContext;

export const ANOMALY_DETECTION_JOB_REALTIME_ISSUE = 'anomaly_detection_realtime_issue';

export type AnomalyDetectionJobRealtimeIssue = typeof ANOMALY_DETECTION_JOB_REALTIME_ISSUE;

export const REALTIME_ISSUE_DETECTED: ActionGroup<AnomalyDetectionJobRealtimeIssue> = {
  id: ANOMALY_DETECTION_JOB_REALTIME_ISSUE,
  name: i18n.translate('xpack.ml.jobsHealthAlertingRule.actionGroupName', {
    defaultMessage: 'Realtime issue detected',
  }),
};

export function registerJobsMonitoringRuleType({
  alerting,
  mlServicesProviders,
  logger,
}: RegisterAlertParams) {
  alerting.registerType<
    AnomalyDetectionJobsHealthRuleParams,
    AlertTypeState,
    AlertInstanceState,
    AnomalyDetectionJobsHealthAlertContext,
    AnomalyDetectionJobRealtimeIssue
  >({
    id: ML_ALERT_TYPES.AD_JOBS_HEALTH,
    name: i18n.translate('xpack.ml.jobsHealthAlertingRule.name', {
      defaultMessage: 'Jobs health monitoring',
    }),
    actionGroups: [REALTIME_ISSUE_DETECTED],
    defaultActionGroupId: ANOMALY_DETECTION_JOB_REALTIME_ISSUE,
    validate: {
      params: anomalyDetectionJobsHealthRuleParams,
    },
    actionVariables: {
      context: [
        {
          name: 'timestamp',
          description: i18n.translate('xpack.ml.alertContext.timestampDescription', {
            defaultMessage: 'The bucket timestamp of the anomaly',
          }),
        },
        {
          name: 'timestampIso8601',
          description: i18n.translate('xpack.ml.alertContext.timestampIso8601Description', {
            defaultMessage: 'The bucket time of the anomaly in ISO8601 format',
          }),
        },
        {
          name: 'jobIds',
          description: i18n.translate('xpack.ml.alertContext.jobIdsDescription', {
            defaultMessage: 'List of job IDs that triggered the alert instance',
          }),
        },
        {
          name: 'message',
          description: i18n.translate('xpack.ml.alertContext.messageDescription', {
            defaultMessage: 'Alert info message',
          }),
        },
      ],
    },
    producer: PLUGIN_ID,
    minimumLicenseRequired: MINIMUM_FULL_LICENSE,
    isExportable: true,
    async executor({ services, params, alertId, state, previousStartedAt, startedAt }) {
      const fakeRequest = {} as KibanaRequest;
      const { getTestsResults } = mlServicesProviders.jobsHealthServiceProvider(
        services.savedObjectsClient,
        fakeRequest,
        logger
      );
      const executionResult = await getTestsResults(params);

      if (executionResult) {
        logger.info(
          `Scheduling actions for tests: ${executionResult.map((v) => v.name).join(', ')}`
        );

        executionResult.forEach(({ name: alertInstanceName, context }) => {
          const alertInstance = services.alertInstanceFactory(alertInstanceName);
          alertInstance.scheduleActions(ANOMALY_DETECTION_JOB_REALTIME_ISSUE, context);
        });
      }
    },
  });
}
