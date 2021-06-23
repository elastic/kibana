/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Query, Filter } from 'src/plugins/data/public';

export type OperationTypePre712 =
  | 'avg'
  | 'cardinality'
  | 'derivative'
  | 'filters'
  | 'terms'
  | 'date_histogram'
  | 'min'
  | 'max'
  | 'sum'
  | 'median'
  | 'percentile'
  | 'last_value'
  | 'count'
  | 'range'
  | 'cumulative_sum'
  | 'counter_rate'
  | 'moving_average';
export type OperationTypePost712 = Exclude<
  OperationTypePre712 | 'average' | 'unique_count' | 'differences',
  'avg' | 'cardinality' | 'derivative'
>;

export interface LensDocShapePre712<VisualizationState = unknown> {
  visualizationType: string | null;
  title: string;
  expression: string | null;
  state: {
    datasourceStates: {
      // This is hardcoded as our only datasource
      indexpattern: {
        layers: Record<
          string,
          {
            columns: Record<
              string,
              {
                operationType: OperationTypePre712;
              }
            >;
          }
        >;
      };
    };
    query: Query;
    visualization: VisualizationState;
    filters: Filter[];
  };
}

export interface LensDocShapePost712<VisualizationState = unknown> {
  visualizationType: string | null;
  title: string;
  expression: string | null;
  state: {
    datasourceMetaData: {
      filterableIndexPatterns: Array<{ id: string; title: string }>;
    };
    datasourceStates: {
      // This is hardcoded as our only datasource
      indexpattern: {
        currentIndexPatternId: string;
        layers: Record<
          string,
          {
            columns: Record<
              string,
              {
                operationType: OperationTypePost712;
              }
            >;
          }
        >;
      };
    };
    visualization: VisualizationState;
    query: Query;
    filters: Filter[];
  };
}
