/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

export const ignoredFieldCauseRT = rt.strict({
  type: rt.keyof({
    'value-malformed': null,
    'value-too-large': null,
    'exceeded-field-limit': null,
    unknown: null,
  }),
});

export type IgnoredFieldCause = rt.TypeOf<typeof ignoredFieldCauseRT>;

export const ignoredFieldProblemRT = rt.strict({
  type: rt.literal('ignored-field'),
  field_name: rt.string,
  document_count: rt.number,
  causes: rt.array(ignoredFieldCauseRT),
});

export const ingestPipelineErrorProblemRT = rt.strict({
  type: rt.literal('ingest-pipeline-error'),
  message: rt.string,
});

export const qualityProblemRT = rt.union([ignoredFieldProblemRT, ingestPipelineErrorProblemRT]);

export type QualityProblem = rt.TypeOf<typeof qualityProblemRT>;
