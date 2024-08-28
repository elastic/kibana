/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createLiteralValueFromUndefinedRT, inRangeRt, isoToEpochRt } from '@kbn/io-ts-utils';
import * as rt from 'io-ts';
import { AssetTypeRT } from '../shared/asset_type';

export const InfraMetricTypeRT = rt.keyof({
  cpu: null,
  cpuV2: null,
  normalizedLoad1m: null,
  diskSpaceUsage: null,
  memory: null,
  memoryFree: null,
  rx: null,
  tx: null,
  rxV2: null,
  txV2: null,
});

export const InfraAssetMetadataTypeRT = rt.keyof({
  'cloud.provider': null,
  'host.ip': null,
  'host.os.name': null,
});

export const InfraAssetMetricsRT = rt.type({
  name: InfraMetricTypeRT,
  value: rt.union([rt.number, rt.null]),
});

export const InfraAssetMetadataRT = rt.type({
  // keep the actual field name from the index mappings
  name: InfraAssetMetadataTypeRT,
  value: rt.union([rt.number, rt.string, rt.null]),
});

export const GetInfraMetricsRequestBodyPayloadRT = rt.intersection([
  rt.partial({
    query: rt.UnknownRecord,
  }),
  rt.type({
    limit: rt.union([inRangeRt(1, 500), createLiteralValueFromUndefinedRT(500)]),
    metrics: rt.array(InfraMetricTypeRT),
    from: isoToEpochRt,
    to: isoToEpochRt,
  }),
]);

export const GetInfraMetricsRequestParamsRT = AssetTypeRT;

export const InfraAssetMetricsItemRT = rt.intersection([
  rt.type({
    name: rt.string,
    metrics: rt.array(InfraAssetMetricsRT),
    metadata: rt.array(InfraAssetMetadataRT),
    hasSystemMetrics: rt.boolean,
  }),
  rt.partial({
    alertsCount: rt.number,
  }),
]);

export const GetInfraMetricsResponsePayloadRT = rt.intersection([
  AssetTypeRT,
  rt.type({
    nodes: rt.array(InfraAssetMetricsItemRT),
  }),
]);

export type InfraAssetMetrics = rt.TypeOf<typeof InfraAssetMetricsRT>;
export type InfraAssetMetadata = rt.TypeOf<typeof InfraAssetMetadataRT>;
export type InfraAssetMetadataType = rt.TypeOf<typeof InfraAssetMetadataTypeRT>;
export type InfraAssetMetricType = rt.TypeOf<typeof InfraMetricTypeRT>;
export type InfraAssetMetricsItem = rt.TypeOf<typeof InfraAssetMetricsItemRT>;

export type GetInfraMetricsRequestBodyPayload = rt.TypeOf<
  typeof GetInfraMetricsRequestBodyPayloadRT
>;

export type GetInfraMetricsRequestBodyPayloadClient = rt.OutputOf<
  typeof GetInfraMetricsRequestBodyPayloadRT
>;

export type GetInfraMetricsResponsePayload = rt.TypeOf<typeof GetInfraMetricsResponsePayloadRT>;
