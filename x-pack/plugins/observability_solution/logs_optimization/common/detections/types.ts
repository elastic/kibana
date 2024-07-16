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

export interface MisspeltFieldDetection {
  type: 'misspelt_field';
  field: string;
  suggestedField: string;
}

export interface FieldExtractionDetection {
  type: 'field_extraction';
  message: string;
  targetField: string;
  value: unknown;
}

export type Detection =
  | IntegrationLikeDetection
  | MisspeltFieldDetection
  | FieldExtractionDetection;
