/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DateFromStringOrNumber } from '@kbn/io-ts-utils';
import * as rt from 'io-ts';
import { DATASET_QUALITY_URL_PREFIX } from './shared';

export const DATA_STREAM_CHECKS_PATH = `${DATASET_QUALITY_URL_PREFIX}/data_stream/:dataStream/checks`;

export const getDatastreamChecksRequestPayloadRT = rt.strict({
  time_range: rt.strict({
    start: DateFromStringOrNumber,
    end: DateFromStringOrNumber,
  }),
});

export const ignoredFieldFailReasonRT = rt.strict({
  type: rt.literal('ignored-field'),
  field_name: rt.string,
});

export const ingestPipelineErrorFailReasonRT = rt.strict({
  type: rt.literal('ingest-pipeline-error'),
  message: rt.string,
});

export const failReasonRT = rt.union([ignoredFieldFailReasonRT, ingestPipelineErrorFailReasonRT]);

export const checkPassedResultRT = rt.strict({
  type: rt.literal('passed'),
});

export const checkFailedResultRT = rt.strict({
  type: rt.literal('failed'),
  reasons: rt.array(failReasonRT),
});

export const checkErrorResultRT = rt.strict({
  type: rt.literal('error'),
  name: rt.string,
  description: rt.string,
});

export const checkResultRT = rt.union([
  checkPassedResultRT,
  checkFailedResultRT,
  checkErrorResultRT,
]);

export const datasetQualityCheckRT = rt.strict({
  id: rt.string,
  started: rt.string,
  finished: rt.string,
  result: checkResultRT,
});

export const skippedDatasetQualityCheckRT = rt.strict({
  id: rt.string,
  reason: rt.string,
});

export const getDatastreamChecksResponsePayloadRT = rt.strict({
  performed_checks: rt.array(datasetQualityCheckRT),
  skipped_checks: rt.array(skippedDatasetQualityCheckRT),
});

export type GetDatastreamChecksResponsePayload = rt.TypeOf<
  typeof getDatastreamChecksResponsePayloadRT
>;
