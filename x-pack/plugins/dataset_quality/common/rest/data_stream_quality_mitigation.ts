/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { mitigationExecutionRT, mitigationParamsRT } from '../data_stream_quality_checks';
import { DATASET_QUALITY_URL_PREFIX } from './shared';

export const getDataStreamMitigationPath = <DataStream extends string>(dataStream: DataStream) =>
  `${DATASET_QUALITY_URL_PREFIX}/data_stream/${dataStream}/mitigation` as const;
export const DATA_STREAM_MITIGATION_PATH = getDataStreamMitigationPath('{dataStream}');

export const postDatastreamMitigationRequestParamsRT = rt.strict({
  dataStream: rt.string,
});

export const postDatastreamMitigationRequestPayloadRT = rt.strict({
  mitigation: mitigationParamsRT,
});

export const postDatastreamMitigationResponsePayloadRT = rt.strict({
  result: mitigationExecutionRT,
});

export type PostDatastreamMitigationResponsePayload = rt.TypeOf<
  typeof postDatastreamMitigationResponsePayloadRT
>;
