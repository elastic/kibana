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
  RuleTypeState,
} from '@kbn/alerting-plugin/common';
import { ML_ALERT_TYPES } from '../../../common/constants/alerts';
import { PLUGIN_ID } from '../../../common/constants/app';
import { MINIMUM_FULL_LICENSE } from '../../../common/license';
import {
  MlAnomalyDetectionAlertParams,
  mlAnomalyDetectionAlertParams,
} from '../../routes/schemas/alerting_schema';
import { RegisterAlertParams } from './register_ml_alerts';
import { InfluencerAnomalyAlertDoc, RecordAnomalyAlertDoc } from '../../../common/types/alerts';

export type AnomalyDetectionAlertContext = {
  name: string;
  jobIds: string[];
  timestampIso8601: string;
  timestamp: number;
  score: number;
  isInterim: boolean;
  topRecords: RecordAnomalyAlertDoc[];
  topInfluencers?: InfluencerAnomalyAlertDoc[];
  anomalyExplorerUrl: string;
} & AlertInstanceContext;

export const ANOMALY_SCORE_MATCH_GROUP_ID = 'anomaly_score_match';

export type AnomalyScoreMatchGroupId = typeof ANOMALY_SCORE_MATCH_GROUP_ID;

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
    async executor({ services, params, alertId, state, previousStartedAt, startedAt }) {
      const fakeRequest = {} as KibanaRequest;
      const { execute } = mlSharedServices.alertingServiceProvider(
        services.savedObjectsClient,
        fakeRequest
      );
      const executionResult = await execute(params, startedAt, previousStartedAt);

      if (executionResult) {
        const alertInstanceName = executionResult.name;
        const alertInstance = services.alertFactory.create(alertInstanceName);
        alertInstance.scheduleActions(ANOMALY_SCORE_MATCH_GROUP_ID, executionResult);
      }
    },
  });
}
