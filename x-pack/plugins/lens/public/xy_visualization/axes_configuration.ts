/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormatFactory } from '../../common';
import {
  AxisExtentConfig,
  XYDataLayerConfig,
} from '../../../../../src/plugins/chart_expressions/expression_xy/common';
import { Datatable } from '../../../../../src/plugins/expressions/public';
import type {
  IFieldFormat,
  SerializedFieldFormat,
} from '../../../../../src/plugins/field_formats/common';

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
  const inclusiveZeroError =
    extent &&
    hasBarOrArea &&
    ((extent.lowerBound !== undefined && extent.lowerBound > 0) ||
      (extent.upperBound !== undefined && extent.upperBound) < 0);
  const boundaryError =
    extent &&
    extent.lowerBound !== undefined &&
    extent.upperBound !== undefined &&
    extent.upperBound <= extent.lowerBound;
  return { inclusiveZeroError, boundaryError };
}
