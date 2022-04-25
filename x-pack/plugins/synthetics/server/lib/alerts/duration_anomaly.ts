/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { KibanaRequest, SavedObjectsClientContract } from '@kbn/core/server';
import moment from 'moment';
import { schema } from '@kbn/config-schema';
import {
  ALERT_EVALUATION_VALUE,
  ALERT_EVALUATION_THRESHOLD,
  ALERT_REASON,
} from '@kbn/rule-data-utils';
import { ActionGroupIdsOf } from '@kbn/alerting-plugin/common';
import { AnomaliesTableRecord } from '@kbn/ml-plugin/common/types/anomalies';
import { getSeverityType } from '@kbn/ml-plugin/common/util/anomaly_utils';
import { updateState, generateAlertMessage, getViewInAppUrl } from './common';
import { DURATION_ANOMALY } from '../../../common/constants/alerts';
import { commonStateTranslations, durationAnomalyTranslations } from './translations';
import { UptimeCorePluginsSetup } from '../adapters/framework';
import { UptimeAlertTypeFactory } from './types';
import { Ping } from '../../../common/runtime_types/ping';
import { getMLJobId } from '../../../common/lib';

import { DurationAnomalyTranslations as CommonDurationAnomalyTranslations } from '../../../common/translations';
import { getMonitorRouteFromMonitorId } from '../../../common/utils/get_monitor_url';

import { createUptimeESClient } from '../lib';
import { ALERT_REASON_MSG, ACTION_VARIABLES, VIEW_IN_APP_URL } from './action_variables';

export type ActionGroupIds = ActionGroupIdsOf<typeof DURATION_ANOMALY>;

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
    bucketSpan: anomaly.source.bucket_span,
  };
};

const getAnomalies = async (
  plugins: UptimeCorePluginsSetup,
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

export const durationAnomalyAlertFactory: UptimeAlertTypeFactory<ActionGroupIds> = (
  server,
  libs,
  plugins
) => ({
  id: 'xpack.uptime.alerts.durationAnomaly',
  producer: 'uptime',
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
    context: [ACTION_VARIABLES[ALERT_REASON_MSG], ACTION_VARIABLES[VIEW_IN_APP_URL]],
    state: [...durationAnomalyTranslations.actionVariables, ...commonStateTranslations],
  },
  isExportable: true,
  minimumLicenseRequired: 'platinum',
  async executor({
    params,
    services: { alertWithLifecycle, scopedClusterClient, savedObjectsClient, getAlertStartedDate },
    state,
    startedAt,
  }) {
    const uptimeEsClient = createUptimeESClient({
      esClient: scopedClusterClient.asCurrentUser,
      savedObjectsClient,
    });
    const { basePath } = server;

    const { anomalies } =
      (await getAnomalies(plugins, savedObjectsClient, params, state.lastCheckedAt as string)) ??
      {};

    const foundAnomalies = anomalies?.length > 0;

    if (foundAnomalies) {
      const monitorInfo = await libs.requests.getLatestMonitor({
        uptimeEsClient,
        dateStart: 'now-15m',
        dateEnd: 'now',
        monitorId: params.monitorId,
      });

      anomalies.forEach((anomaly, index) => {
        const summary = getAnomalySummary(anomaly, monitorInfo);
        const alertReasonMessage = generateAlertMessage(
          CommonDurationAnomalyTranslations.defaultActionMessage,
          summary
        );

        const alertId = DURATION_ANOMALY.id + index;
        const indexedStartedAt = getAlertStartedDate(alertId) ?? startedAt.toISOString();
        const relativeViewInAppUrl = getMonitorRouteFromMonitorId({
          monitorId: DURATION_ANOMALY.id + index,
          dateRangeEnd: 'now',
          dateRangeStart: indexedStartedAt,
        });

        const alertInstance = alertWithLifecycle({
          id: alertId,
          fields: {
            'monitor.id': params.monitorId,
            'url.full': summary.monitorUrl,
            'observer.geo.name': summary.observerLocation,
            'anomaly.start': summary.anomalyStartTimestamp,
            'anomaly.bucket_span.minutes': summary.bucketSpan,
            [ALERT_EVALUATION_VALUE]: anomaly.actualSort,
            [ALERT_EVALUATION_THRESHOLD]: anomaly.typicalSort,
            [ALERT_REASON]: alertReasonMessage,
          },
        });
        alertInstance.replaceState({
          ...updateState(state, false),
          ...summary,
        });
        alertInstance.scheduleActions(DURATION_ANOMALY.id, {
          [ALERT_REASON_MSG]: alertReasonMessage,
          [VIEW_IN_APP_URL]: getViewInAppUrl(relativeViewInAppUrl, basePath),
        });
      });
    }

    return updateState(state, foundAnomalies);
  },
});
