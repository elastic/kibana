/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicesGetMappingIndexMappingRecord } from '@elastic/elasticsearch/lib/api/types';

export interface Mappings {
  pattern: string;
  indexes: Record<string, IndicesGetMappingIndexMappingRecord>;
}

export interface AllowedValue {
  description?: string;
  name?: string;
}

export interface EcsMetadata {
  allowed_values?: AllowedValue[];
  dashed_name?: string;
  description?: string;
  example?: string;
  flat_name?: string;
  level?: string;
  name?: string;
  required?: boolean;
  short?: string;
  type?: string;
}

export type EnrichedFieldMetadata = EcsMetadata & {
  hasEcsMetadata: boolean;
  indexFieldName: string;
  indexFieldType: string;
  indexInvalidValues: UnallowedValueCount[];
  isEcsCompliant: boolean;
};

export interface PartitionedFieldMetadata {
  all: EnrichedFieldMetadata[];
  ecsCompliant: EnrichedFieldMetadata[];
  nonEcs: EnrichedFieldMetadata[];
  notEcsCompliant: EnrichedFieldMetadata[];
}

export interface PartitionedFieldMetadataStats {
  all: number;
  ecsCompliant: number;
  nonEcs: number;
  notEcsCompliant: number;
}

export interface UnallowedValueRequestItem {
  allowedValues: string[];
  indexFieldName: string;
  indexName: string;
}

export interface Bucket {
  key: string;
  doc_count: number;
}

export interface UnallowedValueCount {
  fieldName: string;
  count: number;
}

export interface UnallowedValueSearchResult {
  aggregations?: {
    [x: string]: {
      buckets?: Bucket[];
    };
  };
}

export type IlmPhase = 'hot' | 'warm' | 'cold' | 'frozen' | 'unmanaged';

export interface IlmExplainPhaseCounts {
  hot: number;
  warm: number;
  cold: number;
  frozen: number;
  unmanaged: number;
}
