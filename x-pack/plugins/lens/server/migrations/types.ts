/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PaletteOutput, CustomPaletteParams } from '@kbn/coloring';
import { Filter } from '@kbn/es-query';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { Query } from '@kbn/data-plugin/public';
import type { MigrateFunctionsObject } from '@kbn/kibana-utils-plugin/common';
import type { LayerType, PersistableFilter, ValueLabelConfig } from '../../common';

export type CustomVisualizationMigrations = Record<string, () => MigrateFunctionsObject>;

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

export type LensDocShape713 = Omit<LensDocShapePost712, 'state'> & {
  state: Omit<LensDocShapePost712['state'], 'datasourceStates'> & {
    datasourceStates: {
      indexpattern: Omit<
        LensDocShapePost712['state']['datasourceStates']['indexpattern'],
        'layers'
      > & {
        layers: Record<
          string,
          Omit<
            LensDocShapePost712['state']['datasourceStates']['indexpattern']['layers'][string],
            'columns'
          > & {
            columns: Record<
              string,
              | {
                  operationType: OperationTypePost712;
                }
              | {
                  operationType: 'date_histogram';
                  params: {
                    interval: string;
                    timeZone?: string;
                  };
                }
            >;
          }
        >;
      };
    };
  };
};

export type LensDocShape714 = Omit<LensDocShapePost712, 'state'> & {
  state: Omit<LensDocShapePost712['state'], 'datasourceStates'> & {
    datasourceStates: {
      indexpattern: Omit<
        LensDocShapePost712['state']['datasourceStates']['indexpattern'],
        'layers'
      > & {
        layers: Record<
          string,
          Omit<
            LensDocShapePost712['state']['datasourceStates']['indexpattern']['layers'][string],
            'columns'
          > & {
            columns: Record<
              string,
              | {
                  operationType: OperationTypePost712;
                }
              | {
                  operationType: 'date_histogram';
                  params: {
                    interval: string;
                  };
                }
            >;
          }
        >;
      };
    };
  };
};

interface LayerPre715 {
  layerId: string;
}

export type VisStatePre715 = LayerPre715 | { layers: LayerPre715[] };

interface LayerPost715 extends LayerPre715 {
  layerType: LayerType;
}

export type VisStatePost715 = LayerPost715 | { layers: LayerPost715[] };

export interface LensDocShape715<VisualizationState = unknown> {
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
            columnOrder: string[];
            columns: Record<string, Record<string, unknown>>;
          }
        >;
      };
    };
    visualization: VisualizationState;
    query: Query;
    filters: PersistableFilter[];
  };
}

export type LensDocShape810<VisualizationState = unknown> = Omit<
  LensDocShape715<VisualizationState>,
  'filters' | 'state'
> & {
  filters: Filter[];
  state: Omit<LensDocShape715<VisualizationState>['state'], 'datasourceStates'> & {
    datasourceStates: {
      indexpattern: Omit<LensDocShape715['state']['datasourceStates']['indexpattern'], 'layers'> & {
        layers: Record<
          string,
          Omit<
            LensDocShape715['state']['datasourceStates']['indexpattern']['layers'][string],
            'columns'
          > & {
            columns: Record<
              string,
              | {
                  operationType: 'terms';
                  params: {
                    secondaryFields?: string[];
                  };
                  [key: string]: unknown;
                }
              | {
                  operationType: OperationTypePost712;
                  params: Record<string, unknown>;
                  [key: string]: unknown;
                }
            >;
          }
        >;
      };
    };
  };
};

export type VisState716 =
  // Datatable
  | {
      columns: Array<{
        palette?: PaletteOutput<CustomPaletteParams>;
        colorMode?: 'none' | 'cell' | 'text';
      }>;
    }
  // Heatmap
  | {
      palette?: PaletteOutput<CustomPaletteParams>;
    };

// Datatable only
export interface VisState810 {
  fitRowToContent?: boolean;
}

// Datatable only
export interface VisState820 {
  rowHeight: 'auto' | 'single' | 'custom';
  rowHeightLines: number;
}

export type LensDocShape830<VisualizationState = unknown> = LensDocShape810<VisualizationState>;

export interface XYVisualizationStatePre830 extends VisState820 {
  valueLabels: 'hide' | 'inside' | 'outside';
}

export interface XYVisualizationState830 extends VisState820 {
  valueLabels: ValueLabelConfig;
}

export type VisStatePre830 = XYVisualizationStatePre830 & VisState820;
export type VisState830 = XYVisualizationState830 & VisState820;
