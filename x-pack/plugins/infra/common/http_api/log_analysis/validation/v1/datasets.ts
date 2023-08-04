/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

export const LOG_ANALYSIS_VALIDATE_DATASETS_PATH =
  '/api/infra/log_analysis/validation/log_entry_datasets';

/**
 * Request types
 */
export const validateLogEntryDatasetsRequestPayloadRT = rt.type({
  data: rt.type({
    indices: rt.array(rt.string),
    timestampField: rt.string,
    startTime: rt.number,
    endTime: rt.number,
    runtimeMappings: rt.UnknownRecord,
  }),
});

export type ValidateLogEntryDatasetsRequestPayload = rt.TypeOf<
  typeof validateLogEntryDatasetsRequestPayloadRT
>;

/**
 * Response types
 * */
const logEntryDatasetsEntryRT = rt.strict({
  indexName: rt.string,
  datasets: rt.array(rt.string),
});

export const validateLogEntryDatasetsResponsePayloadRT = rt.type({
  data: rt.type({
    datasets: rt.array(logEntryDatasetsEntryRT),
  }),
});

export type ValidateLogEntryDatasetsResponsePayload = rt.TypeOf<
  typeof validateLogEntryDatasetsResponsePayloadRT
>;
