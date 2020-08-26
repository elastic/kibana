/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PivotAggDict } from './pivot_aggs';
import { PivotGroupByDict } from './pivot_group_by';

export type IndexName = string;
export type IndexPattern = string;
export type TransformId = string;

export interface PreviewRequestBody {
  pivot: {
    group_by: PivotGroupByDict;
    aggregations: PivotAggDict;
  };
  source: {
    index: IndexPattern | IndexPattern[];
    query?: any;
  };
}

export interface CreateRequestBody extends PreviewRequestBody {
  description?: string;
  dest: {
    index: IndexName;
  };
  frequency?: string;
  settings?: {
    max_page_search_size?: number;
    docs_per_second?: number;
  };
  sync?: {
    time: {
      delay?: string;
      field: string;
    };
  };
}

export interface TransformPivotConfig extends CreateRequestBody {
  id: TransformId;
  create_time?: number;
  version?: string;
}
