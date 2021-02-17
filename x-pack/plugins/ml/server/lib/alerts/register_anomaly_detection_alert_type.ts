/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { KibanaRequest } from 'kibana/server';
import {
  ML_ALERT_TYPES,
  ML_ALERT_TYPES_CONFIG,
  AnomalyScoreMatchGroupId,
} from '../../../common/constants/alerts';
import { PLUGIN_ID } from '../../../common/constants/app';
import { MINIMUM_FULL_LICENSE } from '../../../common/license';
import {
  MlAnomalyDetectionAlertParams,
  mlAnomalyDetectionAlertParams,
} from '../../routes/schemas/alerting_schema';
import { RegisterAlertParams } from './register_ml_alerts';
import { InfluencerAnomalyAlertDoc, RecordAnomalyAlertDoc } from '../../../common/types/alerts';
import {
  AlertInstanceContext,
  AlertInstanceState,
  AlertTypeState,
} from '../../../../alerts/common';

const alertTypeConfig = ML_ALERT_TYPES_CONFIG[ML_ALERT_TYPES.ANOMALY_DETECTION];

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
  kibanaBaseUrl: string;
} & AlertInstanceContext;

export function registerAnomalyDetectionAlertType({
  alerts,
  mlSharedServices,
  publicBaseUrl,
}: RegisterAlertParams) {
  alerts.registerType<
    MlAnomalyDetectionAlertParams,
    AlertTypeState,
    AlertInstanceState,
    AnomalyDetectionAlertContext,
    AnomalyScoreMatchGroupId
  >({
    id: ML_ALERT_TYPES.ANOMALY_DETECTION,
    name: alertTypeConfig.name,
    actionGroups: alertTypeConfig.actionGroups,
    defaultActionGroupId: alertTypeConfig.defaultActionGroupId,
    validate: {
      params: mlAnomalyDetectionAlertParams,
    },
    actionVariables: {
      context: [
        {
          name: 'timestamp',
          description: i18n.translate('xpack.ml.alertContext.timestampDescription', {
            defaultMessage: 'Timestamp of the anomaly',
          }),
        },
        {
          name: 'timestampIso8601',
          description: i18n.translate('xpack.ml.alertContext.timestampIso8601Description', {
            defaultMessage: 'Time in ISO8601 format',
          }),
        },
        {
          name: 'jobIds',
          description: i18n.translate('xpack.ml.alertContext.jobIdsDescription', {
            defaultMessage: 'List of job IDs triggered the alert instance',
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
            defaultMessage: 'Anomaly score',
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
        // TODO remove when https://github.com/elastic/kibana/pull/90525 is merged
        {
          name: 'kibanaBaseUrl',
          description: i18n.translate('xpack.ml.alertContext.kibanaBasePathUrlDescription', {
            defaultMessage: 'Kibana base path',
          }),
          useWithTripleBracesInTemplates: true,
        },
      ],
    },
    producer: PLUGIN_ID,
    minimumLicenseRequired: MINIMUM_FULL_LICENSE,
    async executor({ services, params, alertId, state, previousStartedAt, startedAt }) {
      const fakeRequest = {} as KibanaRequest;
      const { execute } = mlSharedServices.alertingServiceProvider(
        services.savedObjectsClient,
        fakeRequest
      );
      const executionResult = await execute(
        params,
        publicBaseUrl,
        alertId,
        startedAt,
        previousStartedAt
      );

      if (executionResult) {
        const alertInstanceName = executionResult.name;
        const alertInstance = services.alertInstanceFactory(alertInstanceName);
        alertInstance.scheduleActions(alertTypeConfig.defaultActionGroupId, executionResult);
      }
    },
  });
}
