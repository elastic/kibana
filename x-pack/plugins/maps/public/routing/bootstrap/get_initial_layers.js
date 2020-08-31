/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import rison from 'rison-node';
import { i18n } from '@kbn/i18n';
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
import { getIsEmsEnabled, getToasts } from '../../kibana_services';
import { INITIAL_LAYERS_KEY } from '../../../common/constants';
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

export function getInitialLayersFromUrlParam() {
  const locationSplit = window.location.href.split('?');
  if (locationSplit.length <= 1) {
    return [];
  }
  const mapAppParams = new URLSearchParams(locationSplit[1]);
  if (!mapAppParams.has(INITIAL_LAYERS_KEY)) {
    return [];
  }

  try {
    let mapInitLayers = mapAppParams.get(INITIAL_LAYERS_KEY);
    if (mapInitLayers[mapInitLayers.length - 1] === '#') {
      mapInitLayers = mapInitLayers.substr(0, mapInitLayers.length - 1);
    }
    return rison.decode_array(mapInitLayers);
  } catch (e) {
    getToasts().addWarning({
      title: i18n.translate('xpack.maps.initialLayers.unableToParseTitle', {
        defaultMessage: `Initial layers not added to map`,
      }),
      text: i18n.translate('xpack.maps.initialLayers.unableToParseMessage', {
        defaultMessage: `Unable to parse contents of 'initialLayers' parameter. Error: {errorMsg}`,
        values: { errorMsg: e.message },
      }),
    });
    return [];
  }
}
