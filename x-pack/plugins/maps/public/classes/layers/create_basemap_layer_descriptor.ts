/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import { LayerDescriptor } from '../../../common/descriptor_types';
import { getKibanaTileMap } from '../../util';
import { getEMSSettings } from '../../kibana_services';
// @ts-expect-error
import { KibanaTilemapSource } from '../sources/kibana_tilemap_source';
import { RasterTileLayer } from './raster_tile_layer/raster_tile_layer';
import { EmsVectorTileLayer } from './ems_vector_tile_layer/ems_vector_tile_layer';
import { EMSTMSSource } from '../sources/ems_tms_source';

export function createBasemapLayerDescriptor(): LayerDescriptor | null {
  const tilemapSourceFromKibana = getKibanaTileMap();
  if (_.get(tilemapSourceFromKibana, 'url')) {
    const layerDescriptor = RasterTileLayer.createDescriptor({
      sourceDescriptor: KibanaTilemapSource.createDescriptor(),
    });
    return layerDescriptor;
  }

  const isEmsEnabled = getEMSSettings()!.isEMSEnabled();
  if (isEmsEnabled) {
    const layerDescriptor = EmsVectorTileLayer.createDescriptor({
      sourceDescriptor: EMSTMSSource.createDescriptor({ isAutoSelect: true }),
    });
    return layerDescriptor;
  }

  return null;
}
