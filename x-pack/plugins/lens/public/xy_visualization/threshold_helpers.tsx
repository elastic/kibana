/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { layerTypes } from '../../common';
import { XYLayerConfig, YConfig } from '../../common/expressions';
import { DatasourcePublicAPI, FramePublicAPI } from '../types';
import { isPercentageSeries } from './state_helpers';
import { XYState } from './types';
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
  datasourceLayers: Record<string, DatasourcePublicAPI>
): Array<T & { valid: boolean }> {
  if (!state) {
    return [];
  }
  const dataLayers = state.layers.filter(
    ({ layerType = layerTypes.DATA }) => layerType === layerTypes.DATA
  );
  const groupsAvailable = getGroupsAvailableInData(dataLayers, datasourceLayers);
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
  datasourceLayers: Record<string, DatasourcePublicAPI>
): T[] {
  if (!state) {
    return [];
  }
  const dataLayers = state.layers.filter(
    ({ layerType = layerTypes.DATA }) => layerType === layerTypes.DATA
  );
  const groupsAvailable = getGroupsAvailableInData(dataLayers, datasourceLayers);
  return thresholdLayers.filter(({ label }: T) => groupsAvailable[label]);
}
/**
 * Returns a dictionary with the groups filled in all the data layers
 */
export function getGroupsAvailableInData(
  dataLayers: XYState['layers'],
  datasourceLayers: Record<string, DatasourcePublicAPI>
) {
  const hasNumberHistogram = dataLayers.some(
    checkScaleOperation('interval', 'number', datasourceLayers)
  );
  return dataLayers.reduce(
    (memo, dataLayer) => {
      if (!memo.x && hasNumberHistogram) {
        memo.x = Boolean(dataLayer.xAccessor);
      }
      if (!memo.yLeft) {
        const leftConfigs = dataLayer.yConfig?.filter(({ axisMode }) => axisMode !== 'right');
        const hasMoreConfigsThanAccessor =
          dataLayer.accessors.length > (dataLayer.yConfig?.length ?? 0);

        memo.yLeft = Boolean(
          dataLayer.accessors.length &&
            (leftConfigs == null || leftConfigs.length || hasMoreConfigsThanAccessor)
        );
      }
      if (!memo.yRight) {
        memo.yRight = Boolean(
          dataLayer.accessors.length &&
            dataLayer.yConfig?.some(({ axisMode }) => axisMode === 'right')
        );
      }
      return memo;
    },
    { x: false, yLeft: false, yRight: false }
  );
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
  return (
    computeStaticValueForGroup(
      dataLayers,
      activeData,
      getAccessorCriteriaForGroup(groupId),
      (layer) => groupId === 'x' && !layerHasNumberHistogram(layer)
    ) || fallbackValue
  );
}

function getAccessorCriteriaForGroup(
  groupId: 'x' | 'yLeft' | 'yRight'
): (layer: XYLayerConfig) => string | undefined {
  switch (groupId) {
    case 'x':
      return ({ xAccessor }) => xAccessor;
    case 'yLeft':
      return ({ accessors, yConfig }) => {
        if (yConfig == null) {
          return accessors[0];
        }
        return yConfig.find(({ axisMode }) => axisMode == null || axisMode === 'left')?.forAccessor;
      };
    case 'yRight':
      return ({ yConfig }) => {
        return yConfig?.find(({ axisMode }) => axisMode === 'right')?.forAccessor;
      };
  }
}

function computeStaticValueForGroup(
  dataLayers: XYState['layers'],
  activeData: NonNullable<FramePublicAPI['activeData']>,
  getColumnIdForGroup: (layer: XYLayerConfig) => string | undefined,
  dropForDateHistogram: (layer: XYLayerConfig) => boolean
) {
  const dataLayer = dataLayers.find(getColumnIdForGroup);

  if (dataLayer) {
    if (isPercentageSeries(dataLayer?.seriesType)) {
      return 0.75;
    }
    if (dropForDateHistogram(dataLayer)) {
      return;
    }
    const columnId = getColumnIdForGroup(dataLayer);
    const tableId = Object.keys(activeData).find((key) =>
      activeData[key].columns.some(({ id }) => id === columnId)
    );
    if (columnId && tableId) {
      const columnMax = activeData[tableId].rows.reduce(
        (max, row) => Math.max(row[columnId], max),
        -Infinity
      );
      return Number(((columnMax * 3) / 4).toFixed(2));
    }
  }
}
