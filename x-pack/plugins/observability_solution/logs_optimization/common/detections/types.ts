/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { EsqlHit } from '../types';

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
  tasks: {
    processors?: IngestProcessorContainer[];
  };
}

export interface FieldExtractionDetection {
  type: 'field_extraction';
  sourceField: string;
  targetField: string;
  pattern: string;
  documentSamples: EsqlHit[];
  tasks: {
    processors?: IngestProcessorContainer[];
  };
}

export type Detection = IntegrationLikeDetection | MappingGapsDetection | FieldExtractionDetection;
