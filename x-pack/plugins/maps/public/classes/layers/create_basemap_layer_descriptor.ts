/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { LayerDescriptor } from '../../../common/descriptor_types';
import { getKibanaTileMap } from '../../meta';
import { getEMSSettings } from '../../kibana_services';
// @ts-expect-error
import { KibanaTilemapSource } from '../sources/kibana_tilemap_source';
import { TileLayer } from './tile_layer/tile_layer';
import { VectorTileLayer } from './vector_tile_layer/vector_tile_layer';
// @ts-expect-error
import { EMSTMSSource } from '../sources/ems_tms_source';

export function createBasemapLayerDescriptor(): LayerDescriptor | null {
  const tilemapSourceFromKibana = getKibanaTileMap();
  if (_.get(tilemapSourceFromKibana, 'url')) {
    const layerDescriptor = TileLayer.createDescriptor({
      sourceDescriptor: KibanaTilemapSource.createDescriptor(),
    });
    return layerDescriptor;
  }

  const isEmsEnabled = getEMSSettings()!.isEMSEnabled();
  if (isEmsEnabled) {
    const layerDescriptor = VectorTileLayer.createDescriptor({
      sourceDescriptor: EMSTMSSource.createDescriptor({ isAutoSelect: true }),
    });
    return layerDescriptor;
  }

  return null;
}
