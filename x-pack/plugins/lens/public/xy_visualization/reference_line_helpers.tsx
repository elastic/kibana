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
import { isPercentageSeries, isStackedChart } from './state_helpers';
import type { XYState } from './types';
import { checkScaleOperation } from './visualization_helpers';

export interface ReferenceLineBase {
  label: 'x' | 'yRight' | 'yLeft';
}

/**
 * Return the reference layers groups to show based on multiple criteria:
 * * what groups are current defined in data layers
 * * what existing reference line are currently defined in data reference lines
 */
export function getGroupsToShow<T extends ReferenceLineBase & { config?: YConfig[] }>(
  referenceLineLayers: T[],
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
  return referenceLineLayers
    .filter(({ label, config }: T) => groupsAvailable[label] || config?.length)
    .map((layer) => ({ ...layer, valid: groupsAvailable[layer.label] }));
}

/**
 * Returns the reference layers groups to show based on what groups are current defined in data layers.
 */
export function getGroupsRelatedToData<T extends ReferenceLineBase>(
  referenceLineLayers: T[],
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
  return referenceLineLayers.filter(({ label }: T) => groupsAvailable[label]);
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

  // filter and organize data dimensions into reference line groups
  // now pick the columnId in the active data
  const { dataLayers: filteredLayers, accessors } = getAccessorCriteriaForGroup(
    groupId,
    dataLayers,
    activeData
  );
  if (groupId === 'x' && filteredLayers.length && !filteredLayers.some(layerHasNumberHistogram)) {
    return fallbackValue;
  }
  return (
    computeStaticValueForGroup(
      filteredLayers,
      accessors,
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
    case 'x': {
      const filteredDataLayers = dataLayers.filter(({ xAccessor }) => xAccessor);
      return {
        dataLayers: filteredDataLayers,
        accessors: filteredDataLayers.map(({ xAccessor }) => xAccessor) as string[],
      };
    }
    case 'yLeft': {
      const { left } = groupAxesByType(dataLayers, activeData);
      const leftIds = new Set(left.map(({ layer }) => layer));
      return {
        dataLayers: dataLayers.filter(({ layerId }) => leftIds.has(layerId)),
        accessors: left.map(({ accessor }) => accessor),
      };
    }
    case 'yRight': {
      const { right } = groupAxesByType(dataLayers, activeData);
      const rightIds = new Set(right.map(({ layer }) => layer));
      return {
        dataLayers: dataLayers.filter(({ layerId }) => rightIds.has(layerId)),
        accessors: right.map(({ accessor }) => accessor),
      };
    }
  }
}

function computeStaticValueForGroup(
  dataLayers: XYLayerConfig[],
  accessorIds: string[],
  activeData: NonNullable<FramePublicAPI['activeData']>,
  minZeroBased: boolean
) {
  const defaultReferenceLineFactor = 3 / 4;

  if (dataLayers.length && accessorIds.length) {
    if (dataLayers.some(({ seriesType }) => isPercentageSeries(seriesType))) {
      return defaultReferenceLineFactor;
    }

    const accessorMap = new Set(accessorIds);
    const tableIds = Object.keys(activeData)
      .map((key) => ({
        tableId: key,
        accessors: activeData[key].columns.filter(({ id }) => accessorMap.has(id)),
      }))
      .filter(({ accessors }) => accessors.length);

    // Compute the max and min bounds here for all involved layers
    // * for stacked series type compute the sum of it
    // * for no stacked series just check min/max
    // Collect the results at the end
    let columnMax = -Infinity;
    let columnMin = Infinity;
    for (const { tableId, accessors } of tableIds) {
      let tableMax = -Infinity;
      let tableMin = Infinity;
      const isStacked = isStackedChart(
        dataLayers.find(({ layerId }) => layerId === tableId)!.seriesType
      );
      for (const row of activeData[tableId].rows) {
        if (!isStacked) {
          for (const { id } of accessors) {
            tableMax = Math.max(row[id], tableMax);
            tableMin = Math.min(row[id], tableMin);
          }
        } else {
          const value = accessors.reduce((v, { id }) => v + (row[id] || 0), 0);
          tableMax = Math.max(value, columnMax);
          tableMin = Math.min(value, columnMin);
        }
      }
      columnMax = Math.max(tableMax, columnMax);
      columnMin = Math.min(tableMin, columnMin);
    }
    if (isFinite(columnMin) && isFinite(columnMax)) {
      // Custom axis bounds can go below 0, so consider also lower values than 0
      const finalMinValue = minZeroBased ? Math.min(0, columnMin) : columnMin;
      const interval = columnMax - finalMinValue;
      return Number((finalMinValue + interval * defaultReferenceLineFactor).toFixed(2));
    }
  }
}
