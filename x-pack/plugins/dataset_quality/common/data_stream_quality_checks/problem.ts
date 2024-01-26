/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { ignoredFieldCauseRT } from './cause';

export const ignoredFieldProblemParamsRT = rt.strict({
  type: rt.literal('ignored-field'),
  field_name: rt.string,
});

export const ignoredFieldProblemInfosRT = rt.strict({
  document_count: rt.number,
  causes: rt.array(ignoredFieldCauseRT),
});

export const ignoredFieldProblemRT = rt.intersection([
  ignoredFieldProblemParamsRT,
  ignoredFieldProblemInfosRT,
]);

export const ingestPipelineErrorProblemParamsRT = rt.strict({
  type: rt.literal('ingest-pipeline-error'),
  pipelineId: rt.string,
  processorId: rt.string,
});

export const ingestPipelineErrorProblemInfosRT = rt.strict({
  message: rt.string,
});

export const ingestPipelineErrorProblemRT = rt.intersection([
  ingestPipelineErrorProblemParamsRT,
  ingestPipelineErrorProblemInfosRT,
]);

export const qualityProblemRT = rt.union([ignoredFieldProblemRT, ingestPipelineErrorProblemRT]);

export type QualityProblem = rt.TypeOf<typeof qualityProblemRT>;

export type QualityProblemType = QualityProblem['type'];

export const qualityProblemParamsRT = rt.union([
  ignoredFieldProblemParamsRT,
  ingestPipelineErrorProblemParamsRT,
]);

export type QualityProblemParams = rt.TypeOf<typeof qualityProblemParamsRT>;
