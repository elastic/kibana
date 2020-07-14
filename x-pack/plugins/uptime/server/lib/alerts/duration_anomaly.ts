/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { schema } from '@kbn/config-schema';
import { ILegacyScopedClusterClient } from 'kibana/server';
import { updateState } from './common';
import { ACTION_GROUP_DEFINITIONS } from '../../../common/constants';
import { commonStateTranslations, durationAnomalyTranslations } from './translations';
import { AnomaliesTableRecord } from '../../../../ml/common/types/anomalies';
import { getSeverityType } from '../../../../ml/common/util/anomaly_utils';
import { getLatestMonitor } from '../requests';
import { savedObjectsAdapter } from '../saved_objects';
import { UptimeCorePlugins } from '../adapters/framework';
import { UptimeAlertTypeFactory } from './types';
import { Ping } from '../../../common/runtime_types/ping';
import { getMLJobId } from '../../../common/lib';

const { DURATION_ANOMALY } = ACTION_GROUP_DEFINITIONS;

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
  mlClusterClient: ILegacyScopedClusterClient,
  params: Record<any, any>,
  lastCheckedAt: string
) => {
  const { getAnomaliesTableData } = plugins.ml.resultsServiceProvider(mlClusterClient, {
    params: 'DummyKibanaRequest',
  } as any);

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
  producer: 'uptime',
  async executor(options) {
    const {
      services: {
        alertInstanceFactory,
        callCluster,
        savedObjectsClient,
        getLegacyScopedClusterClient,
      },
      state,
      params,
    } = options;

    const { anomalies } =
      (await getAnomalies(
        plugins,
        getLegacyScopedClusterClient(plugins.ml.mlClient),
        params,
        state.lastCheckedAt
      )) ?? {};

    const foundAnomalies = anomalies?.length > 0;

    if (foundAnomalies) {
      const dynamicSettings = await savedObjectsAdapter.getUptimeDynamicSettings(
        savedObjectsClient
      );
      const monitorInfo = await getLatestMonitor({
        dynamicSettings,
        callES: callCluster,
        dateStart: 'now-15m',
        dateEnd: 'now',
        monitorId: params.monitorId,
      });
      anomalies.forEach((anomaly, index) => {
        const alertInstance = alertInstanceFactory(DURATION_ANOMALY.id + index);
        const summary = getAnomalySummary(anomaly, monitorInfo);
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
