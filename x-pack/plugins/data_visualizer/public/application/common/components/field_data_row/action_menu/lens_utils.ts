/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { IndexPattern } from '../../../../../../../../../src/plugins/data/common/index_patterns/index_patterns';
import type { CombinedQuery } from '../../../../index_data_visualizer/types/combined_query';
import type {
  IndexPatternColumn,
  TypedLensByValueInput,
  XYLayerConfig,
} from '../../../../../../../lens/public';
import { FieldVisConfig } from '../../stats_table/types';
import { JOB_FIELD_TYPES } from '../../../../../../common';
interface ColumnsAndLayer {
  columns: Record<string, IndexPatternColumn>;
  layer: XYLayerConfig;
}

const TOP_VALUES_LABEL = i18n.translate('xpack.dataVisualizer.index.lensChart.topValuesLabel', {
  defaultMessage: 'Top values',
});
const COUNT = i18n.translate('xpack.dataVisualizer.index.lensChart.countLabel', {
  defaultMessage: 'Count',
});

export function getNumberSettings(item: FieldVisConfig, defaultIndexPattern: IndexPattern) {
  // if index has no timestamp field
  if (defaultIndexPattern.timeFieldName === undefined) {
    const columns: Record<string, IndexPatternColumn> = {
      col1: {
        label: item.fieldName!,
        dataType: 'number',
        isBucketed: true,
        operationType: 'range',
        params: {
          type: 'histogram',
          maxBars: 'auto',
          ranges: [],
        },
        sourceField: item.fieldName!,
      },
      col2: {
        label: COUNT,
        dataType: 'number',
        isBucketed: false,
        sourceField: 'Records',
        operationType: 'count',
      },
    };

    const layer: XYLayerConfig = {
      accessors: ['col2'],
      layerId: 'layer1',
      seriesType: 'bar',
      xAccessor: 'col1',
    };
    return { columns, layer };
  }

  const columns: Record<string, IndexPatternColumn> = {
    col2: {
      dataType: 'number',
      isBucketed: false,
      label: i18n.translate('xpack.dataVisualizer.index.lensChart.averageOfLabel', {
        defaultMessage: 'Average of {fieldName}',
        values: { fieldName: item.fieldName },
      }),
      operationType: 'average',
      sourceField: item.fieldName!,
    },
    col1: {
      dataType: 'date',
      isBucketed: true,
      label: defaultIndexPattern.timeFieldName!,
      operationType: 'date_histogram',
      params: { interval: 'auto' },
      scale: 'interval',
      sourceField: defaultIndexPattern.timeFieldName!,
    },
  };

  const layer: XYLayerConfig = {
    accessors: ['col2'],
    layerId: 'layer1',
    seriesType: 'line',
    xAccessor: 'col1',
  };

  return { columns, layer };
}
export function getDateSettings(item: FieldVisConfig) {
  const columns: Record<string, IndexPatternColumn> = {
    col2: {
      dataType: 'number',
      isBucketed: false,
      label: COUNT,
      operationType: 'count',
      scale: 'ratio',
      sourceField: 'Records',
    },
    col1: {
      dataType: 'date',
      isBucketed: true,
      label: item.fieldName!,
      operationType: 'date_histogram',
      params: { interval: 'auto' },
      scale: 'interval',
      sourceField: item.fieldName!,
    },
  };
  const layer: XYLayerConfig = {
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
      label: TOP_VALUES_LABEL,
      dataType: 'string',
      isBucketed: true,
      operationType: 'terms',
      params: {
        orderBy: { type: 'column', columnId: 'col2' },
        size: 10,
        orderDirection: 'desc',
      },
      sourceField: item.fieldName!,
    },
    col2: {
      label: COUNT,
      dataType: 'number',
      isBucketed: false,
      sourceField: 'Records',
      operationType: 'count',
    },
  };
  const layer: XYLayerConfig = {
    accessors: ['col2'],
    layerId: 'layer1',
    seriesType: 'bar',
    xAccessor: 'col1',
  };

  return { columns, layer };
}

export function getBooleanSettings(item: FieldVisConfig) {
  const columns: Record<string, IndexPatternColumn> = {
    col1: {
      label: TOP_VALUES_LABEL,
      dataType: 'string',
      isBucketed: true,
      operationType: 'terms',
      params: {
        orderBy: { type: 'alphabetical' },
        size: 2,
        orderDirection: 'desc',
      },
      sourceField: item.fieldName!,
    },
    col2: {
      label: COUNT,
      dataType: 'number',
      isBucketed: false,
      sourceField: 'Records',
      operationType: 'count',
    },
  };
  const layer: XYLayerConfig = {
    accessors: ['col2'],
    layerId: 'layer1',
    seriesType: 'bar',
    xAccessor: 'col1',
  };

  return { columns, layer };
}

export function getCompatibleLensDataType(type: FieldVisConfig['type']): string | undefined {
  let lensType: string | undefined;
  switch (type) {
    case JOB_FIELD_TYPES.KEYWORD:
      lensType = 'string';
      break;
    case JOB_FIELD_TYPES.DATE:
      lensType = 'date';
      break;
    case JOB_FIELD_TYPES.NUMBER:
      lensType = 'number';
      break;
    case JOB_FIELD_TYPES.IP:
      lensType = 'ip';
      break;
    case JOB_FIELD_TYPES.BOOLEAN:
      lensType = 'string';
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

  if (fieldType === JOB_FIELD_TYPES.DATE) {
    return getDateSettings(item);
  }
  if (fieldType === JOB_FIELD_TYPES.NUMBER) {
    return getNumberSettings(item, defaultIndexPattern);
  }
  if (fieldType === JOB_FIELD_TYPES.IP || fieldType === JOB_FIELD_TYPES.KEYWORD) {
    return getKeywordSettings(item);
  }
  if (fieldType === JOB_FIELD_TYPES.BOOLEAN) {
    return getBooleanSettings(item);
  }
}
// Get formatted Lens visualization format depending on field type
// currently only supports the following types:
// 'document' | 'string' | 'number' | 'date' | 'boolean' | 'ip'
export function getLensAttributes(
  defaultIndexPattern: IndexPattern | undefined,
  combinedQuery: CombinedQuery,
  item: FieldVisConfig
): TypedLensByValueInput['attributes'] | undefined {
  if (defaultIndexPattern === undefined || item.type === undefined || item.fieldName === undefined)
    return;

  const presets = getColumnsAndLayer(item.type, item, defaultIndexPattern);

  if (!presets) return;

  return {
    visualizationType: 'lnsXY',
    title: i18n.translate('xpack.dataVisualizer.index.lensChart.chartTitle', {
      defaultMessage: 'Lens for {fieldName}',
      values: { fieldName: item.fieldName },
    }),
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
