/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep, mapValues } from 'lodash';
import { PaletteOutput } from 'src/plugins/charts/common';
import { MigrateFunctionsObject } from '../../../../../src/plugins/kibana_utils/common';
import {
  LensDocShapePre712,
  OperationTypePre712,
  LensDocShapePost712,
  LensDocShape713,
  LensDocShape714,
  LensDocShape715,
  VisStatePost715,
  VisStatePre715,
  VisState716,
} from './types';
import { CustomPaletteParams, layerTypes } from '../../common';
import { LensDocShape } from './saved_object_migrations';

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
  (newAttributes as LensDocShapePost712).state.datasourceStates.indexpattern.layers =
    Object.fromEntries(
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
  (newAttributes as LensDocShapePost712).state.datasourceStates.indexpattern.layers =
    Object.fromEntries(
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

function moveDefaultPaletteToPercentCustomInPlace(palette?: PaletteOutput<CustomPaletteParams>) {
  if (palette?.params?.reverse && palette.params.name !== 'custom' && palette.params.stops) {
    // change to palette type to custom and migrate to a percentage type of mode
    palette.name = 'custom';
    palette.params.name = 'custom';
    // we can make strong assumptions here:
    // because it was a default palette reversed it means that stops were the default ones
    // so when migrating, because there's no access to active data, we could leverage the
    // percent rangeType to define colorStops in percent.
    //
    // Stops should be defined, but reversed, as the previous code was rewriting them on reverse.
    //
    // The only change the user should notice should be the mode changing from number to percent
    // but the final result *must* be identical
    palette.params.rangeType = 'percent';
    const steps = palette.params.stops.length;
    palette.params.rangeMin = 0;
    palette.params.rangeMax = 80;
    palette.params.steps = steps;
    palette.params.colorStops = palette.params.stops.map(({ color }, index) => ({
      color,
      stop: (index * 100) / steps,
    }));
    palette.params.stops = palette.params.stops.map(({ color }, index) => ({
      color,
      stop: ((1 + index) * 100) / steps,
    }));
  }
}

export const commonMakeReversePaletteAsCustom = (
  attributes: LensDocShape715<VisState716>
): LensDocShape715<VisState716> => {
  const newAttributes = cloneDeep(attributes);
  const vizState = (newAttributes as LensDocShape715<VisState716>).state.visualization;
  if (
    attributes.visualizationType !== 'lnsDatatable' &&
    attributes.visualizationType !== 'lnsHeatmap'
  ) {
    return newAttributes;
  }
  if ('columns' in vizState) {
    for (const column of vizState.columns) {
      if (column.colorMode && column.colorMode !== 'none') {
        moveDefaultPaletteToPercentCustomInPlace(column.palette);
      }
    }
  } else {
    moveDefaultPaletteToPercentCustomInPlace(vizState.palette);
  }
  return newAttributes;
};

export const commonRenameFilterReferences = (attributes: LensDocShape715<VisState716>) => {
  const newAttributes = cloneDeep(attributes);
  for (const filter of newAttributes.state.filters) {
    filter.meta.index = filter.meta.indexRefName;
    delete filter.meta.indexRefName;
  }
  return newAttributes;
};

/**
 * This creates a migration map that applies filter migrations to Lens visualizations
 */
export const getLensFilterMigrations = (
  filterMigrations: MigrateFunctionsObject
): MigrateFunctionsObject =>
  mapValues(filterMigrations, (migrate) => (lensDoc: { attributes: LensDocShape }) => ({
    ...lensDoc,
    attributes: {
      ...lensDoc.attributes,
      state: { ...lensDoc.attributes.state, filters: migrate(lensDoc.attributes.state.filters) },
    },
  }));
