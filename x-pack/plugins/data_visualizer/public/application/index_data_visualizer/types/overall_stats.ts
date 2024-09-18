/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DocumentCountStats } from '../../../../common/types/field_stats';
import type { SupportedFieldType } from '../../../../common/types';
export interface AggregatableField {
  fieldName: string;
  stats: {
    cardinality?: number;
    count?: number;
    sampleCount?: number;
  };
  existsInDocs: boolean;
}

export interface NonAggregatableField {
  fieldName: string;
  stats?: {
    cardinality?: number;
    count?: number;
    sampleCount?: number;
  };
  existsInDocs: boolean;
  secondaryType?: SupportedFieldType;
}

export interface OverallStats {
  totalCount: number;
  documentCountStats?: DocumentCountStats;
  aggregatableExistsFields: AggregatableField[];
  aggregatableNotExistsFields: AggregatableField[];
  nonAggregatableExistsFields: NonAggregatableField[];
  nonAggregatableNotExistsFields: NonAggregatableField[];
}
