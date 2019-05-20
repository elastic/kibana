/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import _ from 'lodash';
import { KibanaTilemapSource } from '../shared/layers/sources/kibana_tilemap_source';
import { EMSTMSSource } from '../shared/layers/sources/ems_tms_source';
import { isMetaDataLoaded, getEMSDataSourcesSync, getKibanaTileMap } from '../meta';
import { DEFAULT_EMS_TILE_LAYER } from '../../common/constants';

export function getInitialLayers(savedMapLayerListJSON) {

  if (savedMapLayerListJSON) {
    return JSON.parse(savedMapLayerListJSON);
  }

  if (!isMetaDataLoaded()) {
    const descriptor = EMSTMSSource.createDescriptor(DEFAULT_EMS_TILE_LAYER);
    const source = new EMSTMSSource(descriptor);
    const layer = source.createDefaultLayer();
    return [
      layer.toLayerDescriptor()
    ];
  }

  const tilemapSourceFromKibana = getKibanaTileMap();
  if (_.get(tilemapSourceFromKibana, 'url')) {
    const sourceDescriptor = KibanaTilemapSource.createDescriptor();
    const source = new KibanaTilemapSource(sourceDescriptor);
    const layer = source.createDefaultLayer();
    return [
      layer.toLayerDescriptor()
    ];
  }

  const emsDataSources = getEMSDataSourcesSync();
  const emsTmsServices = _.get(emsDataSources, 'ems.tms');
  if (emsTmsServices && emsTmsServices.length > 0) {
    const sourceDescriptor = EMSTMSSource.createDescriptor(emsTmsServices[0].id);
    const source = new EMSTMSSource(sourceDescriptor, { emsTmsServices });
    const layer = source.createDefaultLayer();
    return [
      layer.toLayerDescriptor()
    ];
  }

  return [];
}
