/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type {
  PivotAggsConfigWithExtra,
  SortDirection,
  SortMode,
  SortNumericFieldType,
} from '../../../../../../common/pivot_aggs';

export interface TopMetricsAggConfig {
  sortField: string;
  sortSettings?: {
    order?: SortDirection;
    mode?: SortMode;
    numericType?: SortNumericFieldType;
    [unsupported: string]: unknown;
  };
}

export type PivotAggsConfigTopMetrics = PivotAggsConfigWithExtra<
  TopMetricsAggConfig,
  {
    metrics?: estypes.AggregationsTopMetricsValue | estypes.AggregationsTopMetricsValue[];
    size?: estypes.integer;
    sort?: estypes.SortCombinations;
  }
>;
