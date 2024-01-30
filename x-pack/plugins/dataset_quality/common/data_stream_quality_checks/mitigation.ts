/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { qualityProblemCauseRT } from './cause';

export const increaseIgnoreAboveMitigationTypeRT = rt.literal('mapping-increase-ignore-above');

export const increaseIgnoreAboveMitigationRT = rt.strict({
  type: increaseIgnoreAboveMitigationTypeRT,
  data_stream: rt.string,
  field: rt.string,
  limit: rt.number,
});

export const truncateValueMitigationTypeRT = rt.literal('pipeline-truncate-value');

export const truncateValueMitigationRT = rt.strict({
  type: truncateValueMitigationTypeRT,
  data_stream: rt.string,
  field: rt.string,
  limit: rt.number,
});

export const removeFieldMitigationTypeRT = rt.literal('pipeline-remove-field');

export const removeFieldMitigationRT = rt.strict({
  type: removeFieldMitigationTypeRT,
  data_stream: rt.string,
  field: rt.string,
});

export const mitigationRT = rt.union([
  increaseIgnoreAboveMitigationRT,
  truncateValueMitigationRT,
  removeFieldMitigationRT,
]);

export type Mitigation = rt.TypeOf<typeof mitigationRT>;

export const mitigationForCauseRT = rt.strict({
  cause: qualityProblemCauseRT,
  mitigations: rt.array(mitigationRT),
});

export type MitigationForCause = rt.TypeOf<typeof mitigationForCauseRT>;
