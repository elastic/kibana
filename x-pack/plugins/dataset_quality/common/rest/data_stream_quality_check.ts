/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { checkTimeRangeRT, dataStreamQualityCheckExecutionRT } from '../data_stream_quality_checks';
import { DATASET_QUALITY_URL_PREFIX } from './shared';

export const getDataStreamCheckPath = <DataStream extends string, CheckId extends string>(
  dataStream: DataStream,
  checkId: CheckId
) => `${DATASET_QUALITY_URL_PREFIX}/data_stream/${dataStream}/checks/${checkId}` as const;
export const DATA_STREAM_CHECK_PATH = getDataStreamCheckPath(':dataStream', ':checkId');

export const getDatastreamCheckRequestParamsRT = rt.strict({
  dataStream: rt.string,
  checkId: rt.string,
});

export const getDatastreamCheckRequestPayloadRT = rt.strict({
  time_range: checkTimeRangeRT,
});

export const getDatastreamCheckResponsePayloadRT = rt.strict({
  result: dataStreamQualityCheckExecutionRT,
});

export type GetDatastreamCheckResponsePayload = rt.TypeOf<
  typeof getDatastreamCheckResponsePayloadRT
>;
