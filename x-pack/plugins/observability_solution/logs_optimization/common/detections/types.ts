/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

export const mappingGapRT = rt.type({
  field: rt.string,
  target_field: rt.union([rt.string, rt.null]),
});

const processorsRT = rt.record(rt.string, rt.any);

export const mappingGapDetectionRT = rt.type({
  type: rt.literal('mapping_gap'),
  gaps: rt.array(mappingGapRT),
  tasks: rt.partial({
    processors: processorsRT,
  }),
});

export const fieldExtractionDetectionRT = rt.type({
  type: rt.literal('field_extraction'),
  sourceField: rt.string,
  targetField: rt.string,
  pattern: rt.string,
  documentSamples: rt.record(rt.string, rt.any), // TODO: update types
  tasks: rt.partial({
    processors: processorsRT,
  }),
});

export const jsonParsingDetectionRT = rt.type({
  type: rt.literal('json_parsing'),
  sourceField: rt.string,
  documentSamples: rt.record(rt.string, rt.any), // TODO: update types
  tasks: rt.partial({
    processors: processorsRT,
  }),
});

export const detectionRT = rt.union([
  mappingGapDetectionRT,
  fieldExtractionDetectionRT,
  jsonParsingDetectionRT,
]);

export type MappingGap = rt.TypeOf<typeof mappingGapRT>;
export type MappingGapsDetection = rt.TypeOf<typeof mappingGapDetectionRT>;
export type FieldExtractionDetection = rt.TypeOf<typeof fieldExtractionDetectionRT>;
export type JSONParsingDetection = rt.TypeOf<typeof jsonParsingDetectionRT>;
export type Detection = MappingGapsDetection | FieldExtractionDetection | JSONParsingDetection;
