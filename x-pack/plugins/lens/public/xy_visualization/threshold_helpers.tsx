/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { layerTypes } from '../../common';
import type { XYLayerConfig, YConfig } from '../../common/expressions';
import { Datatable } from '../../../../../src/plugins/expressions/public';
import type { DatasourcePublicAPI, FramePublicAPI } from '../types';
import { groupAxesByType } from './axes_configuration';
import { isPercentageSeries } from './state_helpers';
import type { XYState } from './types';
import { checkScaleOperation } from './visualization_helpers';

export interface ThresholdBase {
  label: 'x' | 'yRight' | 'yLeft';
}

/**
 * Return the threshold layers groups to show based on multiple criteria:
 * * what groups are current defined in data layers
 * * what existing threshold are currently defined in data thresholds
 */
export function getGroupsToShow<T extends ThresholdBase & { config?: YConfig[] }>(
  thresholdLayers: T[],
  state: XYState | undefined,
  datasourceLayers: Record<string, DatasourcePublicAPI>,
  tables: Record<string, Datatable> | undefined
): Array<T & { valid: boolean }> {
  if (!state) {
    return [];
  }
  const dataLayers = state.layers.filter(
    ({ layerType = layerTypes.DATA }) => layerType === layerTypes.DATA
  );
  const groupsAvailable = getGroupsAvailableInData(dataLayers, datasourceLayers, tables);
  return thresholdLayers
    .filter(({ label, config }: T) => groupsAvailable[label] || config?.length)
    .map((layer) => ({ ...layer, valid: groupsAvailable[layer.label] }));
}

/**
 * Returns the threshold layers groups to show based on what groups are current defined in data layers.
 */
export function getGroupsRelatedToData<T extends ThresholdBase>(
  thresholdLayers: T[],
  state: XYState | undefined,
  datasourceLayers: Record<string, DatasourcePublicAPI>,
  tables: Record<string, Datatable> | undefined
): T[] {
  if (!state) {
    return [];
  }
  const dataLayers = state.layers.filter(
    ({ layerType = layerTypes.DATA }) => layerType === layerTypes.DATA
  );
  const groupsAvailable = getGroupsAvailableInData(dataLayers, datasourceLayers, tables);
  return thresholdLayers.filter(({ label }: T) => groupsAvailable[label]);
}
/**
 * Returns a dictionary with the groups filled in all the data layers
 */
export function getGroupsAvailableInData(
  dataLayers: XYState['layers'],
  datasourceLayers: Record<string, DatasourcePublicAPI>,
  tables: Record<string, Datatable> | undefined
) {
  const hasNumberHistogram = dataLayers.some(
    checkScaleOperation('interval', 'number', datasourceLayers)
  );
  const { right, left } = groupAxesByType(dataLayers, tables);
  return {
    x: dataLayers.some(({ xAccessor }) => xAccessor != null) && hasNumberHistogram,
    yLeft: left.length > 0,
    yRight: right.length > 0,
  };
}

export function getStaticValue(
  dataLayers: XYState['layers'],
  groupId: 'x' | 'yLeft' | 'yRight',
  { activeData }: Pick<FramePublicAPI, 'activeData'>,
  layerHasNumberHistogram: (layer: XYLayerConfig) => boolean
) {
  const fallbackValue = 100;
  if (!activeData) {
    return fallbackValue;
  }

  // filter and organize data dimensions into threshold groups
  // now pick the columnId in the active data
  const { dataLayer, accessor } = getAccessorCriteriaForGroup(groupId, dataLayers, activeData);
  if (groupId === 'x' && dataLayer && !layerHasNumberHistogram(dataLayer)) {
    return fallbackValue;
  }
  return (
    computeStaticValueForGroup(
      dataLayer,
      accessor,
      activeData,
      groupId !== 'x' // histogram axis should compute the min based on the current data
    ) || fallbackValue
  );
}

function getAccessorCriteriaForGroup(
  groupId: 'x' | 'yLeft' | 'yRight',
  dataLayers: XYState['layers'],
  activeData: FramePublicAPI['activeData']
) {
  switch (groupId) {
    case 'x':
      const dataLayer = dataLayers.find(({ xAccessor }) => xAccessor);
      return {
        dataLayer,
        accessor: dataLayer?.xAccessor,
      };
    case 'yLeft':
      const { left } = groupAxesByType(dataLayers, activeData);
      return {
        dataLayer: dataLayers.find(({ layerId }) => layerId === left[0]?.layer),
        accessor: left[0]?.accessor,
      };
    case 'yRight':
      const { right } = groupAxesByType(dataLayers, activeData);
      return {
        dataLayer: dataLayers.find(({ layerId }) => layerId === right[0]?.layer),
        accessor: right[0]?.accessor,
      };
  }
}

function computeStaticValueForGroup(
  dataLayer: XYLayerConfig | undefined,
  accessorId: string | undefined,
  activeData: NonNullable<FramePublicAPI['activeData']>,
  minZeroBased: boolean
) {
  const defaultThresholdFactor = 3 / 4;

  if (dataLayer && accessorId) {
    if (isPercentageSeries(dataLayer?.seriesType)) {
      return defaultThresholdFactor;
    }
    const tableId = Object.keys(activeData).find((key) =>
      activeData[key].columns.some(({ id }) => id === accessorId)
    );
    if (tableId) {
      const columnMax = activeData[tableId].rows.reduce(
        (max, row) => Math.max(row[accessorId], max),
        -Infinity
      );
      const columnMin = activeData[tableId].rows.reduce(
        (max, row) => Math.min(row[accessorId], max),
        Infinity
      );
      // Custom axis bounds can go below 0, so consider also lower values than 0
      const finalMinValue = minZeroBased ? Math.min(0, columnMin) : columnMin;
      const interval = columnMax - finalMinValue;
      return Number((finalMinValue + interval * defaultThresholdFactor).toFixed(2));
    }
  }
}
