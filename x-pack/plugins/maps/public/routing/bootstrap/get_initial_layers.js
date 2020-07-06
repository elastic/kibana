/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import _ from 'lodash';
// Import each layer type, even those not used, to init in registry
import '../../classes/sources/wms_source';
import '../../classes/sources/ems_file_source';
import '../../classes/sources/es_search_source';
import '../../classes/sources/es_pew_pew_source';
import '../../classes/sources/kibana_regionmap_source';
import '../../classes/sources/es_geo_grid_source';
import '../../classes/sources/xyz_tms_source';
import { KibanaTilemapSource } from '../../classes/sources/kibana_tilemap_source';
import { TileLayer } from '../../classes/layers/tile_layer/tile_layer';
import { EMSTMSSource } from '../../classes/sources/ems_tms_source';
import { VectorTileLayer } from '../../classes/layers/vector_tile_layer/vector_tile_layer';
import { getIsEmsEnabled } from '../../kibana_services';
import { getKibanaTileMap } from '../../meta';

export function getInitialLayers(layerListJSON, initialLayers = []) {
  if (layerListJSON) {
    return JSON.parse(layerListJSON);
  }
  const tilemapSourceFromKibana = getKibanaTileMap();
  if (_.get(tilemapSourceFromKibana, 'url')) {
    const layerDescriptor = TileLayer.createDescriptor({
      sourceDescriptor: KibanaTilemapSource.createDescriptor(),
    });
    return [layerDescriptor, ...initialLayers];
  }

  const isEmsEnabled = getIsEmsEnabled();
  if (isEmsEnabled) {
    const layerDescriptor = VectorTileLayer.createDescriptor({
      sourceDescriptor: EMSTMSSource.createDescriptor({ isAutoSelect: true }),
    });
    return [layerDescriptor, ...initialLayers];
  }

  return initialLayers;
}
