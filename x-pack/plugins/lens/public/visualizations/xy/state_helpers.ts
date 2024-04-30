/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIconType } from '@elastic/eui/src/components/icon/icon';

import { EventAnnotationGroupConfig } from '@kbn/event-annotation-common';

import { isQueryAnnotationConfig } from '@kbn/event-annotation-components';
import { i18n } from '@kbn/i18n';
import fastIsEqual from 'fast-deep-equal';
import { validateQuery } from '@kbn/visualization-ui-components';
import { DataViewsState } from '../../state_management';
import { FramePublicAPI, DatasourcePublicAPI } from '../../types';
import {
  visualizationTypes,
  XYLayerConfig,
  XYDataLayerConfig,
  XYReferenceLineLayerConfig,
  SeriesType,
  YConfig,
  XYAnnotationLayerConfig,
} from './types';
import {
  getDataLayers,
  isAnnotationsLayer,
  isDataLayer,
  isByReferenceAnnotationsLayer,
} from './visualization_helpers';

export function isHorizontalSeries(seriesType: SeriesType) {
  return (
    seriesType === 'bar_horizontal' ||
    seriesType === 'bar_horizontal_stacked' ||
    seriesType === 'bar_horizontal_percentage_stacked'
  );
}

export function isPercentageSeries(seriesType: SeriesType) {
  return (
    seriesType === 'bar_percentage_stacked' ||
    seriesType === 'bar_horizontal_percentage_stacked' ||
    seriesType === 'area_percentage_stacked'
  );
}

export function isStackedChart(seriesType: SeriesType) {
  return seriesType.includes('stacked');
}

export function isHorizontalChart(layers: XYLayerConfig[]) {
  return getDataLayers(layers).every((l) => isHorizontalSeries(l.seriesType));
}

export function getIconForSeries(type: SeriesType): EuiIconType {
  const definition = visualizationTypes.find((t) => t.id === type);

  if (!definition) {
    throw new Error(`Unknown series type ${type}`);
  }

  return (definition.icon as EuiIconType) || 'empty';
}

export const getSeriesColor = (layer: XYLayerConfig, accessor: string) => {
  if (isAnnotationsLayer(layer)) {
    return layer?.annotations?.find((ann) => ann.id === accessor)?.color || null;
  }
  if (isDataLayer(layer) && layer.splitAccessor && !layer.collapseFn) {
    return null;
  }
  return (
    layer?.yConfig?.find((yConfig: YConfig) => yConfig.forAccessor === accessor)?.color || null
  );
};

export const getColumnToLabelMap = (
  layer: XYDataLayerConfig | XYReferenceLineLayerConfig,
  datasource?: DatasourcePublicAPI
) => {
  const columnToLabel: Record<string, string> = {};
  layer.accessors
    .concat(isDataLayer(layer) && layer.splitAccessor ? [layer.splitAccessor] : [])
    .forEach((accessor) => {
      const operation = datasource?.getOperationForColumnId(accessor);
      if (operation?.label) {
        columnToLabel[accessor] = operation.label;
      }
    });
  return columnToLabel;
};

export function hasHistogramSeries(
  layers: XYDataLayerConfig[] = [],
  datasourceLayers?: FramePublicAPI['datasourceLayers']
) {
  if (!datasourceLayers) {
    return false;
  }
  const validLayers = layers.filter(({ accessors }) => accessors.length);

  return validLayers.some(({ layerId, xAccessor }: XYDataLayerConfig) => {
    if (!xAccessor) {
      return false;
    }

    const xAxisOperation = datasourceLayers[layerId]?.getOperationForColumnId(xAccessor);
    return (
      xAxisOperation &&
      xAxisOperation.isBucketed &&
      xAxisOperation.scale &&
      xAxisOperation.scale !== 'ordinal'
    );
  });
}

export const annotationLayerHasUnsavedChanges = (layer: XYAnnotationLayerConfig) => {
  if (!isByReferenceAnnotationsLayer(layer)) {
    return false;
  }

  type PropsToCompare = Pick<
    EventAnnotationGroupConfig,
    'annotations' | 'ignoreGlobalFilters' | 'indexPatternId'
  >;

  const currentConfig: PropsToCompare = {
    annotations: layer.annotations,
    ignoreGlobalFilters: layer.ignoreGlobalFilters,
    indexPatternId: layer.indexPatternId,
  };

  const savedConfig: PropsToCompare = {
    annotations: layer.__lastSaved.annotations,
    ignoreGlobalFilters: layer.__lastSaved.ignoreGlobalFilters,
    indexPatternId: layer.__lastSaved.indexPatternId,
  };

  return !fastIsEqual(currentConfig, savedConfig);
};

export function getAnnotationLayerErrors(
  layer: XYAnnotationLayerConfig,
  columnId: string,
  dataViews: DataViewsState
): string[] {
  if (!layer) {
    return [];
  }
  const annotation = layer.annotations.find(({ id }) => id === columnId);
  if (!annotation || !isQueryAnnotationConfig(annotation)) {
    return [];
  }
  const layerDataView = dataViews.indexPatterns[layer.indexPatternId];

  const invalidMessages: string[] = [];

  if (annotation.timeField == null || annotation.timeField === '') {
    invalidMessages.push(
      i18n.translate('xpack.lens.xyChart.annotationError.timeFieldEmpty', {
        defaultMessage: 'Time field is missing',
      })
    );
  }

  if (annotation.timeField && !Boolean(layerDataView.getFieldByName(annotation.timeField))) {
    invalidMessages.push(
      i18n.translate('xpack.lens.xyChart.annotationError.timeFieldNotFound', {
        defaultMessage: 'Time field {timeField} not found in data view {dataView}',
        values: { timeField: annotation.timeField, dataView: layerDataView.title },
      })
    );
  }

  const { isValid, error } = validateQuery(annotation?.filter, layerDataView);
  if (!isValid && error) {
    invalidMessages.push(error);
  }
  if (annotation.textField && !Boolean(layerDataView.getFieldByName(annotation.textField))) {
    invalidMessages.push(
      i18n.translate('xpack.lens.xyChart.annotationError.textFieldNotFound', {
        defaultMessage: 'Text field {textField} not found in data view {dataView}',
        values: { textField: annotation.textField, dataView: layerDataView.title },
      })
    );
  }
  if (annotation.extraFields?.length) {
    const missingTooltipFields = [];
    for (const field of annotation.extraFields) {
      if (!Boolean(layerDataView.getFieldByName(field))) {
        missingTooltipFields.push(field);
      }
    }
    if (missingTooltipFields.length) {
      invalidMessages.push(
        i18n.translate('xpack.lens.xyChart.annotationError.tooltipFieldNotFound', {
          defaultMessage:
            'Tooltip {missingFields, plural, one {field} other {fields}} {missingTooltipFields} not found in data view {dataView}',
          values: {
            missingTooltipFields: missingTooltipFields.join(', '),
            missingFields: missingTooltipFields.length,
            dataView: layerDataView.title,
          },
        })
      );
    }
  }

  return invalidMessages;
}
