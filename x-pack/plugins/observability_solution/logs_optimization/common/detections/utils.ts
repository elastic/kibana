/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldExtractionDetection, MappingGapsDetection } from './types';

export const createMappingGapsDetection = (
  params: Omit<MappingGapsDetection, 'type'>
): MappingGapsDetection => ({
  ...params,
  type: 'mapping_gap',
});

export const createFieldExtractionDetection = (
  params: Omit<FieldExtractionDetection, 'type'>
): FieldExtractionDetection => ({
  ...params,
  type: 'field_extraction',
});
