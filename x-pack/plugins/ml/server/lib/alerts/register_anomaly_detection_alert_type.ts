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
import { ALERT_NAMESPACE, ALERT_REASON, ALERT_URL } from '@kbn/rule-data-utils';
import { MlAnomalyDetectionAlert } from '@kbn/alerts-as-data-utils';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import { expandFlattenedAlert } from '@kbn/alerting-plugin/server/alerts_client/lib';
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

const ML_ALERT_NAMESPACE = ALERT_NAMESPACE;

export const ALERT_ANOMALY_DETECTION_JOB_ID = `${ML_ALERT_NAMESPACE}.job_id` as const;

export const ALERT_ANOMALY_SCORE = `${ML_ALERT_NAMESPACE}.anomaly_score` as const;
export const ALERT_ANOMALY_IS_INTERIM = `${ML_ALERT_NAMESPACE}.is_interim` as const;
export const ALERT_ANOMALY_TIMESTAMP = `${ML_ALERT_NAMESPACE}.anomaly_timestamp` as const;

export const ALERT_TOP_RECORDS = `${ML_ALERT_NAMESPACE}.top_records` as const;
export const ALERT_TOP_INFLUENCERS = `${ML_ALERT_NAMESPACE}.top_influencers` as const;

export const ANOMALY_DETECTION_AAD_CONFIG: IRuleTypeAlerts<MlAnomalyDetectionAlert> = {
  context: ANOMALY_DETECTION_AAD_INDEX_NAME,
  mappings: {
    fieldMap: {
      [ALERT_ANOMALY_DETECTION_JOB_ID]: {
        type: ES_FIELD_TYPES.KEYWORD,
        array: false,
        required: false,
      },
      [ALERT_ANOMALY_SCORE]: { type: ES_FIELD_TYPES.INTEGER, array: false, required: false },
      [ALERT_ANOMALY_IS_INTERIM]: { type: ES_FIELD_TYPES.BOOLEAN, array: false, required: false },
      [ALERT_ANOMALY_TIMESTAMP]: { type: ES_FIELD_TYPES.DATE, array: false, required: false },
      [ALERT_TOP_RECORDS]: {
        type: ES_FIELD_TYPES.NESTED,
        array: true,
        required: false,
        dynamic: true,
      },
      [ALERT_TOP_INFLUENCERS]: {
        type: ES_FIELD_TYPES.NESTED,
        array: true,
        required: false,
        dynamic: true,
      },
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
      if (!alertsClient) return;

      const executionResult = await execute(params, spaceId);

      if (!executionResult) return;

      const { isHealthy, name, context } = executionResult;

      if (!isHealthy) {
        alertsClient.report({
          id: name,
          actionGroup: ANOMALY_SCORE_MATCH_GROUP_ID,
          context,
          payload: expandFlattenedAlert({
            [ALERT_URL]: context.anomalyExplorerUrl,
            [ALERT_REASON]: context.message,
            [ALERT_ANOMALY_DETECTION_JOB_ID]: context.jobIds[0],
            [ALERT_ANOMALY_SCORE]: context.score,
            [ALERT_ANOMALY_IS_INTERIM]: context.isInterim,
            [ALERT_ANOMALY_TIMESTAMP]: context.timestamp,
            [ALERT_TOP_RECORDS]: context.topRecords,
            [ALERT_TOP_INFLUENCERS]: context.topInfluencers,
          }),
        });
      }

      // Set context for recovered alerts
      for (const recoveredAlert of alertsClient.getRecoveredAlerts()) {
        if (isHealthy) {
          const alertId = recoveredAlert.alert.getId();
          alertsClient.setAlertData({
            id: alertId,
            context,
            payload: expandFlattenedAlert({
              [ALERT_URL]: context.anomalyExplorerUrl,
              [ALERT_REASON]: context.message,
              [ALERT_ANOMALY_DETECTION_JOB_ID]: context.jobIds[0],
            }),
          });
        }
      }

      return { state: {} };
    },
    alerts: ANOMALY_DETECTION_AAD_CONFIG,
  });
}
