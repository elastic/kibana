/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';

export const LOG_ANALYSIS_VALIDATE_DATASETS_PATH =
  '/api/infra/log_analysis/validation/log_entry_datasets';

/**
 * Request types
 */
export const validationDatasetsRequestPayloadRT = rt.type({
  data: rt.type({
    sourceId: rt.string,
    indices: rt.array(rt.string),
    startTime: rt.number,
    endTime: rt.number,
  }),
});

export type ValidationDatasetsRequestPayload = rt.TypeOf<typeof validationDatasetsRequestPayloadRT>;

/**
 * Response types
 * */
const validationDatasetsEntryRT = rt.strict({
  indexName: rt.string,
  datasets: rt.array(rt.string),
});

export const validationDatasetsResponsePayloadRT = rt.type({
  data: rt.type({
    datasets: rt.array(validationDatasetsEntryRT),
  }),
});

export type ValidationDatasetsResponsePayload = rt.TypeOf<
  typeof validationDatasetsResponsePayloadRT
>;
