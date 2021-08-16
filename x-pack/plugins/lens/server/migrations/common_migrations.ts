/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import {
  LensDocShapePre712,
  OperationTypePre712,
  LensDocShapePost712,
  LensDocShape713,
  LensDocShape714,
  LensDocShape715,
  VisStatePost715,
  VisStatePre715,
} from './types';
import { layerTypes } from '../../common';

export const commonRenameOperationsForFormula = (
  attributes: LensDocShapePre712
): LensDocShapePost712 => {
  const renameMapping = {
    avg: 'average',
    cardinality: 'unique_count',
    derivative: 'differences',
  } as const;
  function shouldBeRenamed(op: OperationTypePre712): op is keyof typeof renameMapping {
    return op in renameMapping;
  }
  const newAttributes = cloneDeep(attributes);
  const datasourceLayers = newAttributes.state.datasourceStates.indexpattern.layers || {};
  (newAttributes as LensDocShapePost712).state.datasourceStates.indexpattern.layers = Object.fromEntries(
    Object.entries(datasourceLayers).map(([layerId, layer]) => {
      return [
        layerId,
        {
          ...layer,
          columns: Object.fromEntries(
            Object.entries(layer.columns).map(([columnId, column]) => {
              const copy = {
                ...column,
                operationType: shouldBeRenamed(column.operationType)
                  ? renameMapping[column.operationType]
                  : column.operationType,
              };
              return [columnId, copy];
            })
          ),
        },
      ];
    })
  );
  return newAttributes as LensDocShapePost712;
};

export const commonRemoveTimezoneDateHistogramParam = (
  attributes: LensDocShape713
): LensDocShape714 => {
  const newAttributes = cloneDeep(attributes);
  const datasourceLayers = newAttributes.state.datasourceStates.indexpattern.layers || {};
  (newAttributes as LensDocShapePost712).state.datasourceStates.indexpattern.layers = Object.fromEntries(
    Object.entries(datasourceLayers).map(([layerId, layer]) => {
      return [
        layerId,
        {
          ...layer,
          columns: Object.fromEntries(
            Object.entries(layer.columns).map(([columnId, column]) => {
              if (column.operationType === 'date_histogram' && 'params' in column) {
                const copy = { ...column, params: { ...column.params } };
                delete copy.params.timeZone;
                return [columnId, copy];
              }
              return [columnId, column];
            })
          ),
        },
      ];
    })
  );
  return newAttributes as LensDocShapePost712;
};

export const commonUpdateVisLayerType = (
  attributes: LensDocShape715<VisStatePre715>
): LensDocShape715<VisStatePost715> => {
  const newAttributes = cloneDeep(attributes);
  const visState = (newAttributes as LensDocShape715<VisStatePost715>).state.visualization;
  if ('layerId' in visState) {
    visState.layerType = layerTypes.DATA;
  }
  if ('layers' in visState) {
    for (const layer of visState.layers) {
      layer.layerType = layerTypes.DATA;
    }
  }
  return newAttributes as LensDocShape715<VisStatePost715>;
};
