/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest, SavedObjectsClientContract } from 'kibana/server';
import moment from 'moment';
import { schema } from '@kbn/config-schema';
import { updateState, generateAlertMessage } from './common';
import { DURATION_ANOMALY } from '../../../common/constants/alerts';
import { commonStateTranslations, durationAnomalyTranslations } from './translations';
import { AnomaliesTableRecord } from '../../../../ml/common/types/anomalies';
import { getSeverityType } from '../../../../ml/common/util/anomaly_utils';
import { UptimeCorePlugins } from '../adapters/framework';
import { UptimeAlertTypeFactory } from './types';
import { Ping } from '../../../common/runtime_types/ping';
import { getMLJobId } from '../../../common/lib';
import { getLatestMonitor } from '../requests/get_latest_monitor';

import { DurationAnomalyTranslations as CommonDurationAnomalyTranslations } from '../../../common/translations';

export const getAnomalySummary = (anomaly: AnomaliesTableRecord, monitorInfo: Ping) => {
  return {
    severity: getSeverityType(anomaly.severity),
    severityScore: Math.round(anomaly.severity),
    anomalyStartTimestamp: moment(anomaly.source.timestamp).toISOString(),
    monitor: anomaly.source['monitor.id'],
    monitorUrl: monitorInfo.url?.full,
    slowestAnomalyResponse: Math.round(anomaly.actualSort / 1000) + ' ms',
    expectedResponseTime: Math.round(anomaly.typicalSort / 1000) + ' ms',
    observerLocation: anomaly.entityValue,
  };
};

const getAnomalies = async (
  plugins: UptimeCorePlugins,
  savedObjectsClient: SavedObjectsClientContract,
  params: Record<any, any>,
  lastCheckedAt: string
) => {
  const fakeRequest = {} as KibanaRequest;
  const { getAnomaliesTableData } = plugins.ml.resultsServiceProvider(
    fakeRequest,
    savedObjectsClient
  );

  return await getAnomaliesTableData(
    [getMLJobId(params.monitorId)],
    [],
    [],
    'auto',
    params.severity,
    moment(lastCheckedAt).valueOf(),
    moment().valueOf(),
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    500,
    10,
    undefined
  );
};

export const durationAnomalyAlertFactory: UptimeAlertTypeFactory = (_server, _libs, plugins) => ({
  id: 'xpack.uptime.alerts.durationAnomaly',
  name: durationAnomalyTranslations.alertFactoryName,
  validate: {
    params: schema.object({
      monitorId: schema.string(),
      severity: schema.number(),
    }),
  },
  defaultActionGroupId: DURATION_ANOMALY.id,
  actionGroups: [
    {
      id: DURATION_ANOMALY.id,
      name: DURATION_ANOMALY.name,
    },
  ],
  actionVariables: {
    context: [],
    state: [...durationAnomalyTranslations.actionVariables, ...commonStateTranslations],
  },
  minimumLicenseRequired: 'platinum',
  async executor({
    params,
    services: { alertWithLifecycle, savedObjectsClient, uptimeEsClient },
    state,
  }) {
    const { anomalies } =
      (await getAnomalies(plugins, savedObjectsClient, params, state.lastCheckedAt as string)) ??
      {};

    const foundAnomalies = anomalies?.length > 0;

    if (foundAnomalies) {
      const monitorInfo = await getLatestMonitor({
        uptimeEsClient,
        dateStart: 'now-15m',
        dateEnd: 'now',
        monitorId: params.monitorId,
      });

      anomalies.forEach((anomaly, index) => {
        const summary = getAnomalySummary(anomaly, monitorInfo);

        const alertInstance = alertWithLifecycle({
          id: DURATION_ANOMALY.id + index,
          fields: {
            'monitor.id': params.monitorId,
            'url.full': summary.monitorUrl,
            'anomaly.severity': summary.severity,
            'anomaly.severity_score': summary.severityScore,
            'anomaly.start': summary.anomalyStartTimestamp,
            'anomaly.slowest_response': Math.round(anomaly.actualSort / 1000),
            'anomaly.expected_response': Math.round(anomaly.typicalSort / 1000),
            'anomaly.observer_location': summary.observerLocation,
            reason: generateAlertMessage(
              CommonDurationAnomalyTranslations.defaultActionMessage,
              summary
            ),
          },
        });
        alertInstance.replaceState({
          ...updateState(state, false),
          ...summary,
        });
        alertInstance.scheduleActions(DURATION_ANOMALY.id);
      });
    }

    return updateState(state, foundAnomalies);
  },
});
