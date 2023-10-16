/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { OperationType } from '@kbn/lens-plugin/public';
import { Comparator } from '../../../../../common/custom_threshold_rule/types';

export const Fill = {
  ABOVE: 'above' as const,
  BELOW: 'below' as const,
  NONE: 'none' as const,
};

type FILL_TYPE = typeof Fill[keyof typeof Fill];

export interface FromBasedReferenceLayer {
  [layerId: string]: {
    linkToLayers: any[];
    columns: {
      [accessors: string]: {
        label: string;
        dataType: 'number';
        operationType: 'static_value';
        isStaticValue: true;
        isBucketed: false;
        scale: 'ratio';
        params: {
          value: any;
        };
        customLabel: true;
      };
    };
    columnOrder: string[];
    sampling: number;
    ignoreGlobalFilters: boolean;
    incompleteColumns: Record<string, any>;
  };
}
export interface FromBasedDataLayer {
  [layerId: string]: {
    columns: {
      [columnId: string]: {
        label: string;
        dataType: string;
        operationType: string;
        sourceField: string;
        isBucketed: boolean;
        filter?: {
          query: string;
          language: string;
        };
        scale: string;
        params: {
          size?: number;
          orderBy?: {
            type: string;
            fallback: boolean;
          };
          orderDirection?: string;
          otherBucket?: boolean;
          missingBucket?: boolean;
          interval?: string;
          includeEmptyRows?: boolean;
          dropPartials?: boolean;
          emptyAsNull?: boolean;
          parentFormat?: {
            id: string;
          };
          secondaryFields?: string | string[];
          accuracyMode?: boolean;
        };
      };
    };
    columnOrder: string[];
    sampling: number;
    ignoreGlobalFilters: boolean;
    incompleteColumns: any;
  };
}
export interface LensReferenceLayer {
  layerId: string;
  layerType: string;
  accessors: string[];
  yConfig: Array<{
    forAccessor: string;
    axisMode: string;
    color: string;
    lineWidth: number;
    fill: FILL_TYPE;
  }>;
  splitAccessor?: string;
}

export interface LensDataLayer {
  layerId: string;
  accessors: string[];
  position: string;
  seriesType: string;
  showGridlines: boolean;
  layerType: string;
  colorMapping: {
    assignmentMode: string;
    assignments: any[];
    specialAssignments: Array<{
      rule: {
        type: string;
      };
      color: {
        type: string;
        paletteId: string;
        colorIndex: number;
      };
      touched: boolean;
    }>;
    paletteId: string;
    colorMode: {
      type: string;
    };
  };
  xAccessor: string;
  splitAccessor?: string;
}

export interface AddLensDataLayer {
  layerId: string;
  accessors: string;
  xAccessor: string;
  dataViewId: string;
  timeFieldName?: string;
  operationType: OperationType;
  sourceField: string;
  label: string;
  groupBy?: string | string[];
  query?: string;
}

export interface AddLensReferenceLayer {
  layerId: string;
  accessors: string;
  dataViewId: string;
  value: number;
  label: string;
  lineWidth?: number;
  comparator: Comparator;
  color?: string;
}

export interface LensDoc {
  title: string;
  description: string;
  visualizationType: string;
  type: string;
  references: Array<{
    type: string;
    id: string;
    name: string;
  }>;
  state: {
    visualization: {
      title: string;
      legend: {
        isVisible: boolean;
        position: string;
        showSingleSeries: boolean;
      };
      valueLabels: string;
      preferredSeriesType: string;
      layers: Array<LensDataLayer | LensReferenceLayer>;
      gridlinesVisibilitySettings: {
        x: boolean;
        yLeft: boolean;
        yRight: boolean;
      };
      tickLabelsVisibilitySettings: {
        x: boolean;
        yLeft: boolean;
        yRight: boolean;
      };
      yLeftExtent: {
        mode: string;
        niceValues: boolean;
      };
      hideEndzones: boolean;
      showCurrentTimeMarker: boolean;
      axisTitlesVisibilitySettings: {
        x: boolean;
        yLeft: boolean;
        yRight: boolean;
      };
    };
    query: {
      query: string;
      language: string;
    };
    filters: any[];
    datasourceStates: {
      formBased: {
        layers: FromBasedDataLayer | FromBasedReferenceLayer;
      };
      indexpattern: {
        layers: any;
      };
      textBased: {
        layers: any;
      };
    };
    internalReferences: any[];
    adHocDataViews: any;
  };
}
