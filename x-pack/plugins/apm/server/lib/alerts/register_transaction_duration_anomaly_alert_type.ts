/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { keyBy } from 'lodash';
import { inspect } from 'util';
import { getSeverity } from '../../../common/anomaly_detection';
import { ANOMALY_SEVERITY } from '../../../../ml/common';
import { KibanaRequest, Logger } from '../../../../../../src/core/server';
import {
  AlertType,
  ALERT_TYPES_CONFIG,
  ANOMALY_ALERT_SEVERITY_TYPES,
} from '../../../common/alert_types';
import { AlertingPlugin } from '../../../../alerts/server';
import { MlPluginSetup } from '../../../../ml/server';
import { getMLJobs } from '../service_map/get_service_anomalies';
import { apmActionVariables } from './action_variables';
import { getAnomalySearchTimeRange } from '../anomaly_detection/get_time_range';
import { getTopAnomalyRecords } from '../anomaly_detection/get_top_anomaly_records';
import { getLastAnomalyBuckets } from '../anomaly_detection/get_last_anomaly_buckets';

interface RegisterAlertParams {
  alerts: AlertingPlugin['setup'];
  ml?: MlPluginSetup;
  logger: Logger;
}

const paramsSchema = schema.object({
  serviceName: schema.maybe(schema.string()),
  transactionType: schema.maybe(schema.string()),
  windowSize: schema.number(),
  windowUnit: schema.string(),
  environment: schema.string(),
  anomalySeverityType: schema.oneOf([
    schema.literal(ANOMALY_SEVERITY.CRITICAL),
    schema.literal(ANOMALY_SEVERITY.MAJOR),
    schema.literal(ANOMALY_SEVERITY.MINOR),
    schema.literal(ANOMALY_SEVERITY.WARNING),
  ]),
});

const alertTypeConfig =
  ALERT_TYPES_CONFIG[AlertType.TransactionDurationAnomaly];

export function registerTransactionDurationAnomalyAlertType({
  alerts,
  ml,
  logger,
}: RegisterAlertParams) {
  alerts.registerType({
    id: AlertType.TransactionDurationAnomaly,
    name: alertTypeConfig.name,
    actionGroups: alertTypeConfig.actionGroups,
    defaultActionGroupId: alertTypeConfig.defaultActionGroupId,
    validate: {
      params: paramsSchema,
    },
    actionVariables: {
      context: [
        apmActionVariables.serviceName,
        apmActionVariables.transactionType,
        apmActionVariables.environment,
        apmActionVariables.threshold,
        apmActionVariables.triggerValue,
      ],
    },
    producer: 'apm',
    minimumLicenseRequired: 'basic',
    executor: async ({ services, params, previousStartedAt }) => {
      if (!ml) {
        throw new Error('ML plugin is not available.');
      }

      const alertParams = params;
      const request = {} as KibanaRequest;
      const { mlAnomalySearch } = ml.mlSystemProvider(
        request,
        services.savedObjectsClient
      );
      const anomalyDetectors = ml.anomalyDetectorsProvider(
        request,
        services.savedObjectsClient
      );

      const selectedOption = ANOMALY_ALERT_SEVERITY_TYPES.find(
        (option) => option.type === alertParams.anomalySeverityType
      );

      if (!selectedOption) {
        throw new Error(
          `Anomaly alert severity type ${alertParams.anomalySeverityType} is not supported.`
        );
      }

      const threshold = selectedOption.threshold;

      const mlJobs = await getMLJobs(anomalyDetectors, alertParams.environment);

      if (mlJobs.length === 0) {
        throw new Error('No jobs found for the current space and environment.');
      }

      const now = Date.now();

      const { from, to } = getAnomalySearchTimeRange({
        from: previousStartedAt?.getTime(),
        to: now,
      });

      const jobIds = mlJobs.map((job) => job.job_id);

      const [topAnomalyRecords, lastAnomalyBuckets] = await Promise.all([
        getTopAnomalyRecords({
          from,
          to,
          jobIds,
          strategy: 'latest',
          serviceName: alertParams.serviceName,
          transactionType: alertParams.transactionType,
          mlAnomalySearch,
        }),
        getLastAnomalyBuckets({
          from,
          to,
          jobIds,
          mlAnomalySearch,
        }),
      ]);

      function scheduleAction({
        serviceName,
        severity,
        environment,
        transactionType,
      }: {
        serviceName: string;
        severity: string;
        environment?: string;
        transactionType?: string;
      }) {
        const alertInstanceName = [
          AlertType.TransactionDurationAnomaly,
          serviceName,
          environment,
          transactionType,
        ]
          .filter((name) => name)
          .join('_');

        const alertInstance = services.alertInstanceFactory(alertInstanceName);

        alertInstance.scheduleActions(alertTypeConfig.defaultActionGroupId, {
          serviceName,
          environment,
          transactionType,
          threshold: selectedOption?.label,
          thresholdValue: severity,
        });
      }

      const bucketsByJobIds = keyBy(lastAnomalyBuckets, 'jobId');

      const relevantAnomalyRecords = topAnomalyRecords
        .filter((record) => record.recordScore >= threshold)
        .filter((record) => {
          const isOutdatedAnomalyRecord =
            bucketsByJobIds[record.jobId] &&
            bucketsByJobIds[record.jobId].timestamp > record.timestamp;

          return !isOutdatedAnomalyRecord;
        });

      relevantAnomalyRecords.forEach((record) => {
        const { serviceName, transactionType, recordScore, jobId } = record;

        const jobForAnomaly = mlJobs.find((job) => job.job_id === jobId);

        if (!jobForAnomaly) {
          // we don't throw, because we still want to report other anomalies
          const err = new Error(`Could not find job for anomaly`);
          Object.assign(err, {
            jobId,
            serviceName,
            transactionType,
            recordScore,
          });
          logger.error(err);
          return;
        }

        const severity = getSeverity(recordScore);

        scheduleAction({
          serviceName,
          severity,
          transactionType,
          environment: jobForAnomaly.custom_settings?.job_tags?.environment,
        });
      });
    },
  });
}
