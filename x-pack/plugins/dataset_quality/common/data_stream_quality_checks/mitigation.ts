/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { qualityProblemCauseRT } from './cause';

export const commonMitigationParamsRT = rt.strict({
  data_stream: rt.string,
});

export const increaseIgnoreAboveMitigationTypeRT = rt.literal('mapping-increase-ignore-above');

const increaseIgnoreAboveMitigationParamsRT = rt.strict({
  type: increaseIgnoreAboveMitigationTypeRT,
  field: rt.string,
  limit: rt.number,
});

export const increaseIgnoreAboveMitigationRT = rt.intersection([
  increaseIgnoreAboveMitigationParamsRT,
  commonMitigationParamsRT,
]);

export type IncreaseIgnoreAboveMitigation = rt.TypeOf<typeof increaseIgnoreAboveMitigationRT>;

export const truncateValueMitigationTypeRT = rt.literal('pipeline-truncate-value');

const truncateValueMitigationParamsRT = rt.strict({
  type: truncateValueMitigationTypeRT,
  field: rt.string,
  limit: rt.number,
});

export const truncateValueMitigationRT = rt.intersection([
  truncateValueMitigationParamsRT,
  commonMitigationParamsRT,
]);

export type TruncateValueMitigation = rt.TypeOf<typeof truncateValueMitigationRT>;

export const removeFieldMitigationTypeRT = rt.literal('pipeline-remove-field');

const removeFieldMitigationParamsRT = rt.strict({
  type: removeFieldMitigationTypeRT,
  field: rt.string,
});

export const removeFieldMitigationRT = rt.intersection([
  removeFieldMitigationParamsRT,
  commonMitigationParamsRT,
]);

export type RemoveFieldMitigation = rt.TypeOf<typeof removeFieldMitigationRT>;

export const mitigationParamsRT = rt.union([
  increaseIgnoreAboveMitigationParamsRT,
  truncateValueMitigationParamsRT,
  removeFieldMitigationParamsRT,
]);

export type MitigationParams = rt.TypeOf<typeof mitigationParamsRT>;

export const mitigationRT = rt.union([
  increaseIgnoreAboveMitigationRT,
  truncateValueMitigationRT,
  removeFieldMitigationRT,
]);

export type Mitigation = rt.TypeOf<typeof mitigationRT>;

export type MitigationType = Mitigation['type'];

export const mitigationForCauseRT = rt.strict({
  cause: qualityProblemCauseRT,
  mitigations: rt.array(mitigationRT),
});

export type MitigationForCause = rt.TypeOf<typeof mitigationForCauseRT>;

export const mitigationApplicationChangeRT = rt.strict({
  change: rt.keyof({
    created: null,
    updated: null,
    removed: null,
  }),
  asset_type: rt.keyof({
    'index-template': null,
    'component-template': null,
    'index-mapping': null,
    'ingest-pipeline': null,
  }),
  asset_name: rt.string,
});

export const mitigationAppliedResultRT = rt.strict({
  type: rt.literal('applied'),
  changes: rt.array(mitigationApplicationChangeRT),
});

export const mitigationErrorResultRT = rt.strict({
  type: rt.literal('error'),
  name: rt.string,
  description: rt.string,
});

export const mitigationResultRT = rt.union([mitigationAppliedResultRT, mitigationErrorResultRT]);

export type MitigationResult = rt.TypeOf<typeof mitigationResultRT>;

export const mitigationExecutionRT = rt.strict({
  id: rt.string,
  started: rt.string,
  finished: rt.string,
  result: mitigationResultRT,
});

export type MitigationExecution = rt.TypeOf<typeof mitigationExecutionRT>;
