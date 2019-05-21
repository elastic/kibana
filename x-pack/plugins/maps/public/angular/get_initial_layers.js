/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import _ from 'lodash';
import { KibanaTilemapSource } from '../shared/layers/sources/kibana_tilemap_source';
import { EMSTMSSource } from '../shared/layers/sources/ems_tms_source';
import chrome from 'ui/chrome';
import { isMetaDataLoaded, getEMSDataSourcesSync, getKibanaTileMap } from '../meta';

export function getInitialLayers(savedMapLayerListJSON, isDarkMode) {

  const emsTileLayerId = chrome.getInjected('emsTileLayerId', true);

  const defaultEmsTileLayer = isDarkMode
    ? emsTileLayerId.dark
    : emsTileLayerId.bright;

  if (savedMapLayerListJSON) {
    return JSON.parse(savedMapLayerListJSON);
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

  if (!isMetaDataLoaded()) {
    const descriptor = EMSTMSSource.createDescriptor(defaultEmsTileLayer);
    const source = new EMSTMSSource(descriptor);
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
