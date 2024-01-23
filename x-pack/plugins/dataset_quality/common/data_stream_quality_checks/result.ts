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

export const ignoredFieldFailReasonRT = rt.strict({
  type: rt.literal('ignored-field'),
  field_name: rt.string,
  document_count: rt.number,
  causes: rt.array(ignoredFieldCauseRT),
});

export const ingestPipelineErrorFailReasonRT = rt.strict({
  type: rt.literal('ingest-pipeline-error'),
  message: rt.string,
});

export const failReasonRT = rt.union([ignoredFieldFailReasonRT, ingestPipelineErrorFailReasonRT]);

export type FailReason = rt.TypeOf<typeof failReasonRT>;

export const checkPassedResultRT = rt.strict({
  type: rt.literal('passed'),
});

export const checkFailedResultRT = rt.strict({
  type: rt.literal('failed'),
  reasons: rt.array(failReasonRT),
});

export const checkSkippedResultRT = rt.strict({
  type: rt.literal('skipped'),
  reason: rt.string,
});

export const checkErrorResultRT = rt.strict({
  type: rt.literal('error'),
  name: rt.string,
  description: rt.string,
});

export const checkResultRT = rt.union([
  checkPassedResultRT,
  checkFailedResultRT,
  checkSkippedResultRT,
  checkErrorResultRT,
]);

export type CheckResult = rt.TypeOf<typeof checkResultRT>;
