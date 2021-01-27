/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ML_JOB_FIELD_TYPES } from '../../../../../../../common/constants/field_types';
import type { TypedLensByValueInput } from '../../../../../../../../lens/public';
import type { IndexPattern } from '../../../../../../../../../../src/plugins/data/common/index_patterns/index_patterns';
import type { FieldVisConfig } from '../../../../stats_table/types';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import type { DataType } from '../../../../../../../../lens/public/types';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import type { IndexPatternColumn } from '../../../../../../../../lens/public/indexpattern_datasource/operations/definitions';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import type { LayerConfig } from '../../../../../../../../lens/public/xy_visualization/types';
import type { CombinedQuery } from '../../../common';

interface ColumnsAndLayer {
  columns: Record<string, IndexPatternColumn>;
  layer: LayerConfig;
}

export function getNumberSettings(item: FieldVisConfig, defaultIndexPattern: IndexPattern) {
  const columns: Record<string, IndexPatternColumn> = {
    col2: {
      dataType: 'number',
      isBucketed: false,
      label: `Average of ${item.fieldName}`,
      operationType: 'avg',
      sourceField: item.fieldName!,
    },
    col1: {
      dataType: 'date',
      isBucketed: true,
      label: '@timestamp',
      operationType: 'date_histogram',
      params: { interval: 'auto' },
      scale: 'interval',
      sourceField: defaultIndexPattern.timeFieldName!,
    },
  };
  const layer: LayerConfig = {
    accessors: ['col2'],
    layerId: 'layer1',
    seriesType: 'line',
    xAccessor: 'col1',
  };

  return { columns, layer };
}
export function getDateSettings(item: FieldVisConfig, defaultIndexPattern: IndexPattern) {
  const columns: Record<string, IndexPatternColumn> = {
    col2: {
      dataType: 'number',
      isBucketed: false,
      label: 'Count of records',
      operationType: 'count',
      scale: 'ratio',
      sourceField: 'Records',
    },
    col1: {
      dataType: 'date',
      isBucketed: true,
      label: '@timestamp',
      operationType: 'date_histogram',
      params: { interval: 'auto' },
      scale: 'interval',
      sourceField: defaultIndexPattern.timeFieldName!,
    },
  };
  const layer: LayerConfig = {
    accessors: ['col2'],
    layerId: 'layer1',
    seriesType: 'line',
    xAccessor: 'col1',
  };

  return { columns, layer };
}

export function getKeywordSettings(item: FieldVisConfig) {
  const columns: Record<string, IndexPatternColumn> = {
    col1: {
      label: 'Top value of category',
      dataType: 'string',
      isBucketed: true,
      operationType: 'terms',
      params: {
        orderBy: { type: 'alphabetical' },
        size: 10,
        orderDirection: 'asc',
      },
      sourceField: item.fieldName!,
    },
    col2: {
      label: 'Count',
      dataType: 'number',
      isBucketed: false,
      sourceField: 'Records',
      operationType: 'count',
    },
  };
  const layer: LayerConfig = {
    accessors: ['col2'],
    layerId: 'layer1',
    seriesType: 'bar',
    xAccessor: 'col1',
  };

  return { columns, layer };
}

export function getCompatibleLensDataType(type: FieldVisConfig['type']): DataType | undefined {
  let lensType: DataType | undefined;
  switch (type) {
    case ML_JOB_FIELD_TYPES.KEYWORD:
      lensType = 'string';
      break;
    case ML_JOB_FIELD_TYPES.DATE:
      lensType = 'date';
      break;
    case ML_JOB_FIELD_TYPES.NUMBER:
      lensType = 'number';
      break;
    case ML_JOB_FIELD_TYPES.IP:
      lensType = 'ip';
      break;
    default:
      lensType = undefined;
  }
  return lensType;
}

function getColumnsAndLayer(
  fieldType: FieldVisConfig['type'],
  item: FieldVisConfig,
  defaultIndexPattern: IndexPattern
): ColumnsAndLayer | undefined {
  if (item.fieldName === undefined) return;

  if (fieldType === ML_JOB_FIELD_TYPES.DATE) {
    return getDateSettings(item, defaultIndexPattern);
  }
  if (fieldType === ML_JOB_FIELD_TYPES.NUMBER) {
    return getNumberSettings(item, defaultIndexPattern);
  }
  if (fieldType === ML_JOB_FIELD_TYPES.IP || fieldType === ML_JOB_FIELD_TYPES.KEYWORD) {
    return getKeywordSettings(item);
  }
}
// Get formatted Lens visualization format depending on field type
// currently only supports the following types:
// 'document' | 'string' | 'number' | 'date' | 'boolean' | 'ip'
export function getLensAttributes(
  defaultIndexPattern: IndexPattern,
  combinedQuery: CombinedQuery,
  item: FieldVisConfig
): TypedLensByValueInput['attributes'] | undefined {
  if (item.type === undefined && item.fieldName === undefined) return;

  const presets = getColumnsAndLayer(item.type, item, defaultIndexPattern);

  if (!presets) return;

  return {
    visualizationType: 'lnsXY',
    title: `[Data Visualizer] Lens for ${item.fieldName}`,
    references: [
      {
        id: defaultIndexPattern.id!,
        name: 'indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: defaultIndexPattern.id!,
        name: 'indexpattern-datasource-layer-layer1',
        type: 'index-pattern',
      },
    ],
    state: {
      datasourceStates: {
        indexpattern: {
          layers: {
            layer1: {
              columnOrder: ['col1', 'col2'],
              columns: presets.columns,
            },
          },
        },
      },
      filters: [],
      query: { language: combinedQuery.searchQueryLanguage, query: combinedQuery.searchString },
      visualization: {
        axisTitlesVisibilitySettings: { x: true, yLeft: true, yRight: true },
        fittingFunction: 'None',
        gridlinesVisibilitySettings: { x: true, yLeft: true, yRight: true },
        layers: [presets.layer],
        legend: { isVisible: true, position: 'right' },
        preferredSeriesType: 'line',
        tickLabelsVisibilitySettings: { x: true, yLeft: true, yRight: true },
        valueLabels: 'hide',
      },
    },
  };
}
