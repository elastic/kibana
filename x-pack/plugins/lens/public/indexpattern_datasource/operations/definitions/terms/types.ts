/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldBasedIndexPatternColumn, ValueFormatConfig } from '../column_types';

export interface TermsIndexPatternColumn extends FieldBasedIndexPatternColumn {
  operationType: 'terms';
  params: {
    size: number;
    // accuracy mode is accomplished by increasing shard_size
    accuracyMode?: boolean;
    include?: string[] | number[];
    exclude?: string[] | number[];
    includeIsRegex?: boolean;
    excludeIsRegex?: boolean;
    // if order is alphabetical, the `fallback` flag indicates whether it became alphabetical because there wasn't
    // another option or whether the user explicitly chose to make it alphabetical.
    orderBy:
      | { type: 'alphabetical'; fallback?: boolean }
      | { type: 'rare'; maxDocCount: number }
      | { type: 'column'; columnId: string }
      | { type: 'custom' };
    orderAgg?: FieldBasedIndexPatternColumn;
    orderDirection: 'asc' | 'desc';
    otherBucket?: boolean;
    missingBucket?: boolean;
    secondaryFields?: string[];
    // Terms on numeric fields can be formatted
    format?: ValueFormatConfig;
    parentFormat?: {
      id: string;
    };
  };
}
