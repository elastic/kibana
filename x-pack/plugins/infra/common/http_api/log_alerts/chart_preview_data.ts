/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import {
  ThresholdRT,
  countCriteriaRT,
  timeUnitRT,
  timeSizeRT,
  groupByRT,
} from '../../alerting/logs/log_threshold/types';

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

// This should not have an explicit `any` return type, but it's here because its
// inferred type includes `Comparator` which is a string enum exported from
// common/alerting/logs/log_threshold/types.ts.
//
// There's a bug that's fixed in TypeScript 4.2.0 that will allow us to remove
// the `:any` from this, so remove it when that update happens.
//
// If it's removed before then you get:
//
//     x-pack/plugins/infra/common/http_api/log_alerts/chart_preview_data.ts:44:14 - error TS4023:
//     Exported variable 'getLogAlertsChartPreviewDataAlertParamsSubsetRT' has or is using name 'Comparator'
//     from external module "/Users/smith/Code/kibana/x-pack/plugins/infra/common/alerting/logs/log_threshold/types"
//     but cannot be named.
//
export const getLogAlertsChartPreviewDataAlertParamsSubsetRT: any = rt.intersection([
  rt.type({
    criteria: countCriteriaRT,
    count: rt.intersection([
      rt.type({
        comparator: ThresholdRT.props.comparator,
      }),
      rt.partial({
        value: ThresholdRT.props.value,
      }),
    ]),
    timeUnit: timeUnitRT,
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
