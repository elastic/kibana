/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DocumentCountStats } from '../../../../common/types/field_stats';

export interface AggregatableField {
  fieldName: string;
  stats: {
    cardinality?: number;
    count?: number;
    sampleCount?: number;
  };
  existsInDocs: boolean;
}

export type NonAggregatableField = Omit<AggregatableField, 'stats'>;

export interface OverallStats {
  totalCount: number;
  documentCountStats?: DocumentCountStats;
  aggregatableExistsFields: AggregatableField[];
  aggregatableNotExistsFields: AggregatableField[];
  nonAggregatableExistsFields: NonAggregatableField[];
  nonAggregatableNotExistsFields: NonAggregatableField[];
}
