/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';
import { criteriaRT, TimeUnitRT, timeSizeRT, groupByRT } from '../../alerting/logs/types';

export const LOG_ALERTS_CHART_PREVIEW_DATA_PATH = '/api/infra/log_alerts/chart_preview_data';

const pointRT = rt.type({
  timestamp: rt.number,
  value: rt.number,
});

export type Point = rt.TypeOf<typeof pointRT>;

const serieRT = rt.type({
  id: rt.string,
  points: rt.array(pointRT),
});

const seriesRT = rt.array(serieRT);

export type Series = rt.TypeOf<typeof seriesRT>;

export const getLogAlertsChartPreviewDataSuccessResponsePayloadRT = rt.type({
  data: rt.type({
    series: seriesRT,
  }),
});

export type GetLogAlertsChartPreviewDataSuccessResponsePayload = rt.TypeOf<
  typeof getLogAlertsChartPreviewDataSuccessResponsePayloadRT
>;

export const getLogAlertsChartPreviewDataAlertParamsSubsetRT = rt.intersection([
  rt.type({
    criteria: criteriaRT,
    timeUnit: TimeUnitRT,
    timeSize: timeSizeRT,
  }),
  rt.partial({
    groupBy: groupByRT,
  }),
]);

export type GetLogAlertsChartPreviewDataAlertParamsSubset = rt.TypeOf<
  typeof getLogAlertsChartPreviewDataAlertParamsSubsetRT
>;

export const getLogAlertsChartPreviewDataRequestPayloadRT = rt.type({
  data: rt.type({
    sourceId: rt.string,
    alertParams: getLogAlertsChartPreviewDataAlertParamsSubsetRT,
    buckets: rt.number,
  }),
});

export type GetLogAlertsChartPreviewDataRequestPayload = rt.TypeOf<
  typeof getLogAlertsChartPreviewDataRequestPayloadRT
>;
