/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import _ from 'lodash';
// Import each layer type, even those not used, to init in registry

import '../layers/sources/wms_source';

import '../layers/sources/ems_file_source';

import '../layers/sources/es_search_source';

import '../layers/sources/es_pew_pew_source/es_pew_pew_source';

import '../layers/sources/kibana_regionmap_source';

import '../layers/sources/es_geo_grid_source';

import '../layers/sources/xyz_tms_source';

import { KibanaTilemapSource } from '../layers/sources/kibana_tilemap_source';

import { EMSTMSSource } from '../layers/sources/ems_tms_source';

import { getInjectedVarFunc } from '../kibana_services';

import { getKibanaTileMap } from '../meta';

export function getInitialLayers(layerListJSON, initialLayers = []) {
  if (layerListJSON) {
    return JSON.parse(layerListJSON);
  }

  const tilemapSourceFromKibana = getKibanaTileMap();
  if (_.get(tilemapSourceFromKibana, 'url')) {
    const sourceDescriptor = KibanaTilemapSource.createDescriptor();
    const source = new KibanaTilemapSource(sourceDescriptor);
    const layer = source.createDefaultLayer();
    return [layer.toLayerDescriptor(), ...initialLayers];
  }

  const isEmsEnabled = getInjectedVarFunc()('isEmsEnabled', true);
  if (isEmsEnabled) {
    const descriptor = EMSTMSSource.createDescriptor({ isAutoSelect: true });
    const source = new EMSTMSSource(descriptor);
    const layer = source.createDefaultLayer();
    return [layer.toLayerDescriptor(), ...initialLayers];
  }

  return initialLayers;
}
