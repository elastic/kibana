/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { takeRight } from 'lodash';
import type { KibanaRequest } from '@kbn/core/server';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import type {
  ActionGroup,
  AlertInstanceContext,
  AlertInstanceState,
  RecoveredActionGroupId,
  RuleTypeParams,
  RuleTypeState,
} from '@kbn/alerting-plugin/common';
import type { IRuleTypeAlerts, RuleExecutorOptions } from '@kbn/alerting-plugin/server';
import { AlertsClientError } from '@kbn/alerting-plugin/server';
import { ALERT_REASON, ALERT_URL } from '@kbn/rule-data-utils';
import type { MlAnomalyDetectionAlert } from '@kbn/alerts-as-data-utils';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import {
  ALERT_ANOMALY_DETECTION_JOB_ID,
  ALERT_ANOMALY_IS_INTERIM,
  ALERT_ANOMALY_SCORE,
  ALERT_ANOMALY_TIMESTAMP,
  ALERT_TOP_INFLUENCERS,
  ALERT_TOP_RECORDS,
  ML_ALERT_TYPES,
} from '../../../common/constants/alerts';
import { PLUGIN_ID } from '../../../common/constants/app';
import { MINIMUM_FULL_LICENSE } from '../../../common/license';
import {
  type MlAnomalyDetectionAlertParams,
  mlAnomalyDetectionAlertParams,
} from '../../routes/schemas/alerting_schema';
import type { RegisterAlertParams } from './register_ml_alerts';
import type { InfluencerAnomalyAlertDoc } from '../../../common/types/alerts';
import { type RecordAnomalyAlertDoc } from '../../../common/types/alerts';
import type { AnomalyDetectionRuleState } from './alerting_service';

/**
 * Base Anomaly detection alerting rule context.
 * Relevant for both active and recovered alerts.
 */
export type AnomalyDetectionAlertBaseContext = AlertInstanceContext & {
  jobIds: string[];
  anomalyExplorerUrl: string;
  message: string;
};

// Flattened alert payload for alert-as-data
export type AnomalyDetectionAlertPayload = {
  job_id: string;
  anomaly_score?: number[];
  is_interim?: boolean;
  anomaly_timestamp?: number;
  top_records?: any;
  top_influencers?: any;
} & {
  [ALERT_URL]: string;
  [ALERT_REASON]: string;
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

const ANOMALY_SCORE_HISTORY_LIMIT = 20;

export const ANOMALY_DETECTION_AAD_CONFIG: IRuleTypeAlerts<MlAnomalyDetectionAlert> = {
  context: ANOMALY_DETECTION_AAD_INDEX_NAME,
  mappings: {
    fieldMap: {
      [ALERT_ANOMALY_DETECTION_JOB_ID]: {
        type: ES_FIELD_TYPES.KEYWORD,
        array: false,
        required: true,
      },
      [ALERT_ANOMALY_SCORE]: { type: ES_FIELD_TYPES.DOUBLE, array: true, required: false },
      [ALERT_ANOMALY_IS_INTERIM]: { type: ES_FIELD_TYPES.BOOLEAN, array: false, required: false },
      [ALERT_ANOMALY_TIMESTAMP]: { type: ES_FIELD_TYPES.DATE, array: false, required: false },
      [ALERT_TOP_RECORDS]: {
        type: ES_FIELD_TYPES.OBJECT,
        array: true,
        required: false,
        dynamic: false,
        properties: {
          job_id: { type: ES_FIELD_TYPES.KEYWORD },
          record_score: { type: ES_FIELD_TYPES.DOUBLE },
          initial_record_score: { type: ES_FIELD_TYPES.DOUBLE },
          detector_index: { type: ES_FIELD_TYPES.INTEGER },
          is_interim: { type: ES_FIELD_TYPES.BOOLEAN },
          timestamp: { type: ES_FIELD_TYPES.DATE },
          partition_field_name: { type: ES_FIELD_TYPES.KEYWORD },
          partition_field_value: { type: ES_FIELD_TYPES.KEYWORD },
          over_field_name: { type: ES_FIELD_TYPES.KEYWORD },
          over_field_value: { type: ES_FIELD_TYPES.KEYWORD },
          by_field_name: { type: ES_FIELD_TYPES.KEYWORD },
          by_field_value: { type: ES_FIELD_TYPES.KEYWORD },
          function: { type: ES_FIELD_TYPES.KEYWORD },
          typical: { type: ES_FIELD_TYPES.DOUBLE },
          actual: { type: ES_FIELD_TYPES.DOUBLE },
          field_name: { type: ES_FIELD_TYPES.KEYWORD },
        },
      },
      [ALERT_TOP_INFLUENCERS]: {
        type: ES_FIELD_TYPES.OBJECT,
        array: true,
        required: false,
        dynamic: false,
        properties: {
          job_id: { type: ES_FIELD_TYPES.KEYWORD },
          influencer_field_name: { type: ES_FIELD_TYPES.KEYWORD },
          influencer_field_value: { type: ES_FIELD_TYPES.KEYWORD },
          influencer_score: { type: ES_FIELD_TYPES.DOUBLE },
          initial_influencer_score: { type: ES_FIELD_TYPES.DOUBLE },
          is_interim: { type: ES_FIELD_TYPES.BOOLEAN },
          timestamp: { type: ES_FIELD_TYPES.DATE },
        },
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
  const fieldFormatCache = new Map<string, AnomalyDetectionRuleState>();

  alerting.registerType<
    MlAnomalyDetectionAlertParams,
    never, // Only use if defining useSavedObjectReferences hook
    RuleTypeState,
    AlertInstanceState,
    AnomalyDetectionAlertContext,
    AnomalyScoreMatchGroupId,
    RecoveredActionGroupId,
    MlAnomalyDetectionAlert
  >({
    id: ML_ALERT_TYPES.ANOMALY_DETECTION,
    name: i18n.translate('xpack.ml.anomalyDetectionAlert.name', {
      defaultMessage: 'Anomaly detection',
    }),
    actionGroups: [THRESHOLD_MET_GROUP],
    defaultActionGroupId: ANOMALY_SCORE_MATCH_GROUP_ID,
    validate: {
      params: mlAnomalyDetectionAlertParams,
    },
    schemas: {
      params: {
        type: 'config-schema',
        schema: mlAnomalyDetectionAlertParams,
      },
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
    category: DEFAULT_APP_CATEGORIES.management.id,
    producer: PLUGIN_ID,
    minimumLicenseRequired: MINIMUM_FULL_LICENSE,
    isExportable: true,
    doesSetRecoveryContext: true,
    executor: async ({
      services,
      params,
      spaceId,
      rule,
    }: ExecutorOptions<MlAnomalyDetectionAlertParams>) => {
      const fakeRequest = {} as KibanaRequest;
      const alertingService = mlSharedServices.alertingServiceProvider(
        services.savedObjectsClient,
        fakeRequest
      );

      const { alertsClient } = services;
      if (!alertsClient) {
        throw new AlertsClientError();
      }

      const executionResult = await alertingService.execute(
        params,
        spaceId,
        fieldFormatCache.get(rule.id)
      );

      if (!executionResult) return { state: {} };

      const { isHealthy, name, context, payload, stateUpdate } = executionResult;

      fieldFormatCache.set(rule.id, stateUpdate);

      if (!isHealthy) {
        const { alertDoc } = alertsClient.report({
          id: name,
          actionGroup: ANOMALY_SCORE_MATCH_GROUP_ID,
        });

        let resultPayload = {
          [ALERT_URL]: payload[ALERT_URL],
          [ALERT_REASON]: payload[ALERT_REASON],
          [ALERT_ANOMALY_DETECTION_JOB_ID]: payload.job_id,
          [ALERT_ANOMALY_SCORE]: payload.anomaly_score,
          [ALERT_ANOMALY_IS_INTERIM]: payload.is_interim,
          [ALERT_ANOMALY_TIMESTAMP]: payload.anomaly_timestamp,
          [ALERT_TOP_RECORDS]: payload.top_records,
          [ALERT_TOP_INFLUENCERS]: payload.top_influencers,
          [ALERT_ANOMALY_SCORE]: payload.anomaly_score,
        };

        if (alertDoc) {
          let anomalyScore = alertDoc[ALERT_ANOMALY_SCORE] ?? [];
          if (typeof anomalyScore === 'number') {
            // alert doc has been created before 8.13 with the latest anomaly score only
            anomalyScore = [anomalyScore];
          }
          resultPayload = {
            ...resultPayload,
            [ALERT_ANOMALY_SCORE]: takeRight(
              [...anomalyScore, ...(payload.anomaly_score ?? [])],
              ANOMALY_SCORE_HISTORY_LIMIT
            ),
          };
        }

        alertsClient.setAlertData({
          id: name,
          context,
          payload: resultPayload,
        });
      }

      // Set context for recovered alerts
      for (const recoveredAlert of alertsClient.getRecoveredAlerts()) {
        if (isHealthy) {
          const alertId = recoveredAlert.alert.getId();
          alertsClient.setAlertData({
            id: alertId,
            context,
            payload: {
              [ALERT_URL]: payload[ALERT_URL],
              [ALERT_REASON]: payload[ALERT_REASON],
              [ALERT_ANOMALY_DETECTION_JOB_ID]: payload.job_id,
            },
          });
        }
      }

      return { state: {} };
    },
    alerts: ANOMALY_DETECTION_AAD_CONFIG,
  });
}
