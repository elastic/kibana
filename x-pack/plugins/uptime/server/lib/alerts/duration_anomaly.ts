/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest, SavedObjectsClientContract } from 'kibana/server';
import moment from 'moment';
import { schema } from '@kbn/config-schema';
import {
  ALERT_SEVERITY_LEVEL,
  ALERT_SEVERITY_VALUE,
  ALERT_EVALUATION_VALUE,
  ALERT_EVALUATION_THRESHOLD,
} from '@kbn/rule-data-utils/target/technical_field_names';
import { ActionGroupIdsOf } from '../../../../alerting/common';
import { updateState, generateAlertMessage } from './common';
import { DURATION_ANOMALY } from '../../../common/constants/alerts';
import { commonStateTranslations, durationAnomalyTranslations } from './translations';
import { AnomaliesTableRecord } from '../../../../ml/common/types/anomalies';
import { getSeverityType } from '../../../../ml/common/util/anomaly_utils';
import { UptimeCorePlugins } from '../adapters/framework';
import { UptimeAlertTypeFactory } from './types';
import { Ping } from '../../../common/runtime_types/ping';
import { getMLJobId } from '../../../common/lib';

import { DurationAnomalyTranslations as CommonDurationAnomalyTranslations } from '../../../common/translations';

import { createUptimeESClient } from '../lib';

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

export const durationAnomalyAlertFactory: UptimeAlertTypeFactory<ActionGroupIds> = (
  _server,
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
    context: [],
    state: [...durationAnomalyTranslations.actionVariables, ...commonStateTranslations],
  },
  isExportable: true,
  minimumLicenseRequired: 'platinum',
  async executor({
    params,
    services: { alertWithLifecycle, scopedClusterClient, savedObjectsClient },
    state,
  }) {
    const uptimeEsClient = createUptimeESClient({
      esClient: scopedClusterClient.asCurrentUser,
      savedObjectsClient,
    });
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

        const alertInstance = alertWithLifecycle({
          id: DURATION_ANOMALY.id + index,
          fields: {
            'monitor.id': params.monitorId,
            'url.full': summary.monitorUrl,
            'observer.geo.name': summary.observerLocation,
            'anomaly.start': summary.anomalyStartTimestamp,
            'anomaly.bucket_span.minutes': summary.bucketSpan,
            [ALERT_EVALUATION_VALUE]: anomaly.actualSort,
            [ALERT_EVALUATION_THRESHOLD]: anomaly.typicalSort,
            [ALERT_SEVERITY_LEVEL]: summary.severity,
            [ALERT_SEVERITY_VALUE]: summary.severityScore,
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
