/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LayerConfig } from './types';
import { Datatable, SerializedFieldFormat } from '../../../../../src/plugins/expressions/public';
import { IFieldFormat } from '../../../../../src/plugins/data/public';

interface FormattedMetric {
  layer: string;
  accessor: string;
  fieldFormat: SerializedFieldFormat;
}

type GroupsConfiguration = Array<{
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

export function getAxesConfiguration(
  layers: LayerConfig[],
  shouldRotate: boolean,
  tables?: Record<string, Datatable>,
  formatFactory?: (mapping: SerializedFieldFormat) => IFieldFormat
): GroupsConfiguration {
  const series: { auto: FormattedMetric[]; left: FormattedMetric[]; right: FormattedMetric[] } = {
    auto: [],
    left: [],
    right: [],
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
