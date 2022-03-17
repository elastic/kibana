/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { Filter } from '@kbn/es-query';
import { DataView } from '../../../../../../../../../src/plugins/data_views/public';
import type { CombinedQuery } from '../../../../index_data_visualizer/types/combined_query';
import type {
  DateHistogramIndexPatternColumn,
  GenericIndexPatternColumn,
  RangeIndexPatternColumn,
  TermsIndexPatternColumn,
  TypedLensByValueInput,
  XYLayerConfig,
} from '../../../../../../../lens/public';
import { DOCUMENT_FIELD_NAME as RECORDS_FIELD } from '../../../../../../../lens/common/constants';
import { FieldVisConfig } from '../../stats_table/types';
import { JOB_FIELD_TYPES } from '../../../../../../common/constants';

interface ColumnsAndLayer {
  columns: Record<string, GenericIndexPatternColumn>;
  layer: XYLayerConfig;
}

const TOP_VALUES_LABEL = i18n.translate('xpack.dataVisualizer.index.lensChart.topValuesLabel', {
  defaultMessage: 'Top values',
});
const COUNT = i18n.translate('xpack.dataVisualizer.index.lensChart.countLabel', {
  defaultMessage: 'Count',
});

export function getNumberSettings(item: FieldVisConfig, defaultDataView: DataView) {
  // if index has no timestamp field
  if (defaultDataView.timeFieldName === undefined) {
    const columns: Record<string, GenericIndexPatternColumn> = {
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
      } as RangeIndexPatternColumn,
      col2: {
        label: COUNT,
        dataType: 'number',
        isBucketed: false,
        sourceField: RECORDS_FIELD,
        operationType: 'count',
      },
    };

    const layer: XYLayerConfig = {
      accessors: ['col2'],
      layerId: 'layer1',
      layerType: 'data',
      seriesType: 'bar',
      xAccessor: 'col1',
    };
    return { columns, layer };
  }

  const columns: Record<string, GenericIndexPatternColumn> = {
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
      label: defaultDataView.timeFieldName!,
      operationType: 'date_histogram',
      params: { interval: 'auto' },
      scale: 'interval',
      sourceField: defaultDataView.timeFieldName!,
    } as DateHistogramIndexPatternColumn,
  };

  const layer: XYLayerConfig = {
    accessors: ['col2'],
    layerId: 'layer1',
    layerType: 'data',
    seriesType: 'line',
    xAccessor: 'col1',
  };

  return { columns, layer };
}
export function getDateSettings(item: FieldVisConfig) {
  const columns: Record<string, GenericIndexPatternColumn> = {
    col2: {
      dataType: 'number',
      isBucketed: false,
      label: COUNT,
      operationType: 'count',
      scale: 'ratio',
      sourceField: RECORDS_FIELD,
    },
    col1: {
      dataType: 'date',
      isBucketed: true,
      label: item.fieldName!,
      operationType: 'date_histogram',
      params: { interval: 'auto' },
      scale: 'interval',
      sourceField: item.fieldName!,
    } as DateHistogramIndexPatternColumn,
  };
  const layer: XYLayerConfig = {
    accessors: ['col2'],
    layerId: 'layer1',
    layerType: 'data',
    seriesType: 'line',
    xAccessor: 'col1',
  };

  return { columns, layer };
}

export function getKeywordSettings(item: FieldVisConfig) {
  const columns: Record<string, GenericIndexPatternColumn> = {
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
    } as TermsIndexPatternColumn,
    col2: {
      label: COUNT,
      dataType: 'number',
      isBucketed: false,
      sourceField: RECORDS_FIELD,
      operationType: 'count',
    },
  };
  const layer: XYLayerConfig = {
    accessors: ['col2'],
    layerId: 'layer1',
    layerType: 'data',
    seriesType: 'bar',
    xAccessor: 'col1',
  };

  return { columns, layer };
}

export function getBooleanSettings(item: FieldVisConfig) {
  const columns: Record<string, GenericIndexPatternColumn> = {
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
    } as TermsIndexPatternColumn,
    col2: {
      label: COUNT,
      dataType: 'number',
      isBucketed: false,
      sourceField: RECORDS_FIELD,
      operationType: 'count',
    },
  };
  const layer: XYLayerConfig = {
    accessors: ['col2'],
    layerId: 'layer1',
    layerType: 'data',
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
  defaultDataView: DataView
): ColumnsAndLayer | undefined {
  if (item.fieldName === undefined) return;

  if (fieldType === JOB_FIELD_TYPES.DATE) {
    return getDateSettings(item);
  }
  if (fieldType === JOB_FIELD_TYPES.NUMBER) {
    return getNumberSettings(item, defaultDataView);
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
  defaultDataView: DataView | undefined,
  combinedQuery: CombinedQuery,
  filters: Filter[],
  item: FieldVisConfig
): TypedLensByValueInput['attributes'] | undefined {
  if (defaultDataView === undefined || item.type === undefined || item.fieldName === undefined)
    return;

  const presets = getColumnsAndLayer(item.type, item, defaultDataView);

  if (!presets) return;

  return {
    visualizationType: 'lnsXY',
    title: i18n.translate('xpack.dataVisualizer.index.lensChart.chartTitle', {
      defaultMessage: 'Lens for {fieldName}',
      values: { fieldName: item.fieldName },
    }),
    references: [
      {
        id: defaultDataView.id!,
        name: 'indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: defaultDataView.id!,
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
      filters,
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
