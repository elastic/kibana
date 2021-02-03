/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { ML_JOB_FIELD_TYPES } from '../../../../../../../common/constants/field_types';
import type { TypedLensByValueInput } from '../../../../../../../../lens/public';
import type { FieldVisConfig } from '../../../../stats_table/types';
import type { IndexPatternColumn, XYLayerConfig } from '../../../../../../../../lens/public';
import type { CombinedQuery } from '../../../common';
import type { IIndexPattern } from '../../../../../../../../../../src/plugins/data/common/index_patterns';
interface ColumnsAndLayer {
  columns: Record<string, IndexPatternColumn>;
  layer: XYLayerConfig;
}

const TOP_VALUES_LABEL = i18n.translate('xpack.ml.dataVisualizer.lensChart.topValuesLabel', {
  defaultMessage: 'Top values',
});
const COUNT = i18n.translate('xpack.ml.dataVisualizer.lensChart.countLabel', {
  defaultMessage: 'Count',
});

export function getNumberSettings(item: FieldVisConfig, defaultIndexPattern: IIndexPattern) {
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
      label: i18n.translate('xpack.ml.dataVisualizer.lensChart.averageOfLabel', {
        defaultMessage: 'Average of {fieldName}',
        values: { fieldName: item.fieldName },
      }),
      operationType: 'avg',
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
    case ML_JOB_FIELD_TYPES.BOOLEAN:
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
  defaultIndexPattern: IIndexPattern
): ColumnsAndLayer | undefined {
  if (item.fieldName === undefined) return;

  if (fieldType === ML_JOB_FIELD_TYPES.DATE) {
    return getDateSettings(item);
  }
  if (fieldType === ML_JOB_FIELD_TYPES.NUMBER) {
    return getNumberSettings(item, defaultIndexPattern);
  }
  if (fieldType === ML_JOB_FIELD_TYPES.IP || fieldType === ML_JOB_FIELD_TYPES.KEYWORD) {
    return getKeywordSettings(item);
  }
  if (fieldType === ML_JOB_FIELD_TYPES.BOOLEAN) {
    return getBooleanSettings(item);
  }
}
// Get formatted Lens visualization format depending on field type
// currently only supports the following types:
// 'document' | 'string' | 'number' | 'date' | 'boolean' | 'ip'
export function getLensAttributes(
  defaultIndexPattern: IIndexPattern | undefined,
  combinedQuery: CombinedQuery,
  item: FieldVisConfig
): TypedLensByValueInput['attributes'] | undefined {
  if (defaultIndexPattern === undefined || item.type === undefined || item.fieldName === undefined)
    return;

  const presets = getColumnsAndLayer(item.type, item, defaultIndexPattern);

  if (!presets) return;

  return {
    visualizationType: 'lnsXY',
    title: i18n.translate('xpack.ml.dataVisualizer.lensChart.chartTitle', {
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
