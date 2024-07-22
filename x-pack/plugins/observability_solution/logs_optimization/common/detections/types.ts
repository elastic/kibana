/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface IntegrationLikeDetection {
  type: 'integration_like';
  message: string;
  detectedIntegration: string;
}

interface MappingGap {
  field: string;
  suggestedField: string | null;
}

export interface MappingGapsDetection {
  type: 'mapping_gap';
  gaps: MappingGap[];
}

export interface FieldExtractionDetection {
  type: 'field_extraction';
  sourceField: string;
  targetField: string;
  pattern: string;
}

export type Detection = IntegrationLikeDetection | MappingGapsDetection | FieldExtractionDetection;
