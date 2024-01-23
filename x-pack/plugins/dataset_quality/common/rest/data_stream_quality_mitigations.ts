/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { checkTimeRangeRT } from '../data_stream_quality_checks';
import { DATASET_QUALITY_URL_PREFIX } from './shared';

export const getDataStreamMitigationsPath = <DataStream extends string>(dataStream: DataStream) =>
  `${DATASET_QUALITY_URL_PREFIX}/data_stream/${dataStream}/mitigations` as const;
export const DATA_STREAM_MITIGATIONS_PATH = getDataStreamMitigationsPath('{dataStream}');

export const getDatastreamMitigationsRequestParamsRT = rt.strict({
  dataStream: rt.string,
});

export const getDatastreamMitigationsRequestPayloadRT = rt.strict({
  time_range: checkTimeRangeRT,
  // TODO: continue here
  problem: rt.null,
});

export const getDatastreamMitigationsResponsePayloadRT = rt.strict({
  // TODO: continue here
  mitigations: rt.null,
});

export type GetDatastreamMitigationsResponsePayload = rt.TypeOf<
  typeof getDatastreamMitigationsResponsePayloadRT
>;
