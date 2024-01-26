/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

export const ignoredFieldCauseRT = rt.union([
  rt.strict({
    type: rt.literal('value-malformed'),
    field: rt.string,
    values: rt.array(rt.unknown),
  }),
  rt.strict({
    type: rt.literal('value-too-large'),
    field: rt.string,
    limit: rt.number,
    values: rt.array(rt.unknown),
  }),
  rt.strict({
    type: rt.literal('exceeded-field-limit'),
    limit: rt.number,
  }),
  rt.strict({
    type: rt.literal('unknown'),
  }),
]);

export type IgnoredFieldCause = rt.TypeOf<typeof ignoredFieldCauseRT>;

// this would become a union later
export const qualityProblemCauseRT = ignoredFieldCauseRT;

export type QualityProblemCause = rt.TypeOf<typeof qualityProblemCauseRT>;
