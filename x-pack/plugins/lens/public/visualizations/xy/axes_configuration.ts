/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AxisExtentConfig } from '@kbn/expression-xy-plugin/common';
import { Datatable } from '@kbn/expressions-plugin/public';
import type { IFieldFormat, SerializedFieldFormat } from '@kbn/field-formats-plugin/common';
import { FormatFactory } from '../../../common';
import {
  getDataBounds,
  validateAxisDomain,
  validateZeroInclusivityExtent,
} from '../../shared_components';
import { XYDataLayerConfig } from './types';

interface FormattedMetric {
  layer: string;
  accessor: string;
  fieldFormat: SerializedFieldFormat;
}

export type GroupsConfiguration = Array<{
  groupId: string;
  position: 'left' | 'right' | 'bottom' | 'top';
  formatter?: IFieldFormat;
  series: Array<{ layer: string; accessor: string }>;
}>;

export function isFormatterCompatible(
  formatter1: SerializedFieldFormat,
  formatter2: SerializedFieldFormat
) {
  return formatter1.id === formatter2.id;
}

export function getXDomain(layers: XYDataLayerConfig[] = [], tables?: Record<string, Datatable>) {
  const dataBounds = layers.reduce(
    (bounds, layer) => {
      const tableBounds = getDataBounds(layer.layerId, tables, layer.xAccessor);
      if (tableBounds) {
        return {
          min: Math.min(bounds.min, tableBounds.min),
          max: Math.max(bounds.max, tableBounds.max),
        };
      }
      return bounds;
    },
    { min: Infinity, max: -Infinity }
  );
  if (isFinite(dataBounds.min) && isFinite(dataBounds.max)) {
    return dataBounds;
  }
}

export function groupAxesByType(layers: XYDataLayerConfig[], tables?: Record<string, Datatable>) {
  const series: {
    auto: FormattedMetric[];
    left: FormattedMetric[];
    right: FormattedMetric[];
    bottom: FormattedMetric[];
  } = {
    auto: [],
    left: [],
    right: [],
    bottom: [],
  };

  layers?.forEach((layer) => {
    const table = tables?.[layer.layerId];
    layer.accessors.forEach((accessor) => {
      const mode =
        layer.yConfig?.find((yAxisConfig) => yAxisConfig.forAccessor === accessor)?.axisMode ||
        'auto';
      let formatter: SerializedFieldFormat = table?.columns.find((column) => column.id === accessor)
        ?.meta?.params || { id: 'number' };
      if (layer.seriesType.includes('percentage') && formatter.id !== 'percent') {
        formatter = {
          id: 'percent',
          params: {
            pattern: '0.[00]%',
          },
        };
      }
      series[mode].push({
        layer: layer.layerId,
        accessor,
        fieldFormat: formatter,
      });
    });
  });

  series.auto.forEach((currentSeries) => {
    if (
      series.left.length === 0 ||
      (tables &&
        series.left.every((leftSeries) =>
          isFormatterCompatible(leftSeries.fieldFormat, currentSeries.fieldFormat)
        ))
    ) {
      series.left.push(currentSeries);
    } else if (
      series.right.length === 0 ||
      (tables &&
        series.left.every((leftSeries) =>
          isFormatterCompatible(leftSeries.fieldFormat, currentSeries.fieldFormat)
        ))
    ) {
      series.right.push(currentSeries);
    } else if (series.right.length >= series.left.length) {
      series.left.push(currentSeries);
    } else {
      series.right.push(currentSeries);
    }
  });
  return series;
}

export function getAxesConfiguration(
  layers: XYDataLayerConfig[],
  shouldRotate: boolean,
  tables?: Record<string, Datatable>,
  formatFactory?: FormatFactory
): GroupsConfiguration {
  const series = groupAxesByType(layers, tables);

  const axisGroups: GroupsConfiguration = [];

  if (series.left.length > 0) {
    axisGroups.push({
      groupId: 'left',
      position: shouldRotate ? 'bottom' : 'left',
      formatter: formatFactory?.(series.left[0].fieldFormat),
      series: series.left.map(({ fieldFormat, ...currentSeries }) => currentSeries),
    });
  }

  if (series.right.length > 0) {
    axisGroups.push({
      groupId: 'right',
      position: shouldRotate ? 'top' : 'right',
      formatter: formatFactory?.(series.right[0].fieldFormat),
      series: series.right.map(({ fieldFormat, ...currentSeries }) => currentSeries),
    });
  }

  return axisGroups;
}

export function validateExtent(hasBarOrArea: boolean, extent?: AxisExtentConfig) {
  return {
    inclusiveZeroError: hasBarOrArea && !validateZeroInclusivityExtent(extent),
    boundaryError: !validateAxisDomain(extent),
  };
}
