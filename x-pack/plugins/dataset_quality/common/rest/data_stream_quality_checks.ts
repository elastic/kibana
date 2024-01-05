/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { checkPlanRT, checkTimeRangeRT } from '../data_stream_quality_checks';
import { DATASET_QUALITY_URL_PREFIX } from './shared';

export const getDataStreamChecksPath = <DataStream extends string>(dataStream: DataStream) =>
  `${DATASET_QUALITY_URL_PREFIX}/data_stream/${dataStream}/checks` as const;
export const DATA_STREAM_CHECKS_PATH = getDataStreamChecksPath(':dataStream');

export const getDatastreamChecksRequestParamsRT = rt.strict({
  dataStream: rt.string,
});

export const getDatastreamChecksRequestPayloadRT = rt.strict({
  time_range: checkTimeRangeRT,
});

export const getDatastreamChecksResponsePayloadRT = rt.strict({
  plan: checkPlanRT,
});

export type GetDatastreamChecksResponsePayload = rt.TypeOf<
  typeof getDatastreamChecksResponsePayloadRT
>;
