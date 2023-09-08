/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { KibanaRequest } from '@kbn/core/server';
import {
  ActionGroup,
  AlertInstanceContext,
  AlertInstanceState,
  RuleTypeParams,
  RuleTypeState,
} from '@kbn/alerting-plugin/common';
import { IRuleTypeAlerts, RuleExecutorOptions } from '@kbn/alerting-plugin/server';
import { ALERT_NAMESPACE, ALERT_URL } from '@kbn/rule-data-utils';
import { StackAlert } from '@kbn/alerts-as-data-utils';
import { MlAnomalyDetectionAlert } from '@kbn/alerts-as-data-utils/src/schemas/generated/ml_anomaly_detection_schema';
import { ML_ALERT_TYPES } from '../../../common/constants/alerts';
import { PLUGIN_ID } from '../../../common/constants/app';
import { MINIMUM_FULL_LICENSE } from '../../../common/license';
import {
  MlAnomalyDetectionAlertParams,
  mlAnomalyDetectionAlertParams,
} from '../../routes/schemas/alerting_schema';
import { RegisterAlertParams } from './register_ml_alerts';
import { InfluencerAnomalyAlertDoc, RecordAnomalyAlertDoc } from '../../../common/types/alerts';

/**
 * Base Anomaly detection alerting rule context.
 * Relevant for both active and recovered alerts.
 */
export type AnomalyDetectionAlertBaseContext = AlertInstanceContext & {
  jobIds: string[];
  anomalyExplorerUrl: string;
  message: string;
};

export type AnomalyDetectionAlertContext = AnomalyDetectionAlertBaseContext & {
  timestampIso8601: string;
  timestamp: number;
  score: number;
  isInterim: boolean;
  topRecords: RecordAnomalyAlertDoc[];
  topInfluencers?: InfluencerAnomalyAlertDoc[];
};

export type ExecutorOptions<P extends RuleTypeParams> = RuleExecutorOptions<
  P,
  RuleTypeState,
  {},
  AnomalyDetectionAlertContext,
  typeof ANOMALY_SCORE_MATCH_GROUP_ID,
  MlAnomalyDetectionAlert
>;

export const ANOMALY_SCORE_MATCH_GROUP_ID = 'anomaly_score_match';

export type AnomalyScoreMatchGroupId = typeof ANOMALY_SCORE_MATCH_GROUP_ID;

export const ANOMALY_DETECTION_AAD_INDEX_NAME = 'ml.anomaly-detection';

export const ALERT_ANOMALY_DETECTION_JOB_ID = `${ALERT_NAMESPACE}.jobId` as const;

export const STACK_ALERTS_AAD_CONFIG: IRuleTypeAlerts<StackAlert> = {
  context: ANOMALY_DETECTION_AAD_INDEX_NAME,
  mappings: {
    fieldMap: {
      [ALERT_ANOMALY_DETECTION_JOB_ID]: { type: 'keyword', array: false, required: false },
    },
  },
  shouldWrite: true,
};

export const THRESHOLD_MET_GROUP: ActionGroup<AnomalyScoreMatchGroupId> = {
  id: ANOMALY_SCORE_MATCH_GROUP_ID,
  name: i18n.translate('xpack.ml.anomalyDetectionAlert.actionGroupName', {
    defaultMessage: 'Anomaly score matched the condition',
  }),
};

export function registerAnomalyDetectionAlertType({
  alerting,
  mlSharedServices,
}: RegisterAlertParams) {
  alerting.registerType<
    MlAnomalyDetectionAlertParams,
    never, // Only use if defining useSavedObjectReferences hook
    RuleTypeState,
    AlertInstanceState,
    AnomalyDetectionAlertContext,
    AnomalyScoreMatchGroupId
  >({
    id: ML_ALERT_TYPES.ANOMALY_DETECTION,
    name: i18n.translate('xpack.ml.anomalyDetectionAlert.name', {
      defaultMessage: 'Anomaly detection alert',
    }),
    actionGroups: [THRESHOLD_MET_GROUP],
    defaultActionGroupId: ANOMALY_SCORE_MATCH_GROUP_ID,
    validate: {
      params: mlAnomalyDetectionAlertParams,
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
            defaultMessage: 'List of job IDs that triggered the alert',
          }),
        },
        {
          name: 'message',
          description: i18n.translate('xpack.ml.alertContext.messageDescription', {
            defaultMessage: 'Alert info message',
          }),
        },
        {
          name: 'isInterim',
          description: i18n.translate('xpack.ml.alertContext.isInterimDescription', {
            defaultMessage: 'Indicate if top hits contain interim results',
          }),
        },
        {
          name: 'score',
          description: i18n.translate('xpack.ml.alertContext.scoreDescription', {
            defaultMessage: 'Anomaly score at the time of the notification action',
          }),
        },
        {
          name: 'topRecords',
          description: i18n.translate('xpack.ml.alertContext.topRecordsDescription', {
            defaultMessage: 'Top records',
          }),
        },
        {
          name: 'topInfluencers',
          description: i18n.translate('xpack.ml.alertContext.topInfluencersDescription', {
            defaultMessage: 'Top influencers',
          }),
        },
        {
          name: 'anomalyExplorerUrl',
          description: i18n.translate('xpack.ml.alertContext.anomalyExplorerUrlDescription', {
            defaultMessage: 'URL to open in the Anomaly Explorer',
          }),
          useWithTripleBracesInTemplates: true,
        },
      ],
    },
    producer: PLUGIN_ID,
    minimumLicenseRequired: MINIMUM_FULL_LICENSE,
    isExportable: true,
    doesSetRecoveryContext: true,
    executor: async ({
      services,
      params,
      spaceId,
    }: ExecutorOptions<MlAnomalyDetectionAlertParams>) => {
      const fakeRequest = {} as KibanaRequest;
      const { execute } = mlSharedServices.alertingServiceProvider(
        services.savedObjectsClient,
        fakeRequest
      );

      const { alertsClient } = services;

      const executionResult = await execute(params, spaceId);

      if (executionResult && !executionResult.isHealthy) {
        alertsClient?.report({
          id: executionResult.name,
          actionGroup: ANOMALY_SCORE_MATCH_GROUP_ID,
          context: executionResult.context,
          payload: {
            [ALERT_URL]: executionResult.context.anomalyExplorerUrl,
          },
        });
      }

      // Set context for recovered alerts
      const { getRecoveredAlerts } = services.alertFactory.done();
      for (const recoveredAlert of getRecoveredAlerts()) {
        if (!!executionResult?.isHealthy) {
          recoveredAlert.setContext(executionResult.context);
        }
      }

      return { state: {} };
    },
    alerts: STACK_ALERTS_AAD_CONFIG,
  });
}
