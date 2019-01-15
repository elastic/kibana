/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import _ from 'lodash';
import { KibanaTilemapSource } from '../shared/layers/sources/kibana_tilemap_source';
import { EMSTMSSource } from '../shared/layers/sources/ems_tms_source';

export function getInitialLayers(savedMapLayerListJSON, dataSources) {
  if (savedMapLayerListJSON) {
    return JSON.parse(savedMapLayerListJSON);
  }

  const kibanaTilemapUrl = _.get(dataSources, 'kibana.tilemap.url');
  if (kibanaTilemapUrl) {
    const sourceDescriptor = KibanaTilemapSource.createDescriptor(kibanaTilemapUrl);
    const source = new KibanaTilemapSource(sourceDescriptor);
    const layer = source.createDefaultLayer();
    return [
      layer.toLayerDescriptor()
    ];
  }

  const emsTmsServices = _.get(dataSources, 'ems.tms');
  if (emsTmsServices && emsTmsServices.length > 0) {
    const sourceDescriptor = EMSTMSSource.createDescriptor(emsTmsServices[0].id);
    const source = new EMSTMSSource(sourceDescriptor, { emsTmsServices });
    const layer = source.createDefaultLayer();
    return [
      layer.toLayerDescriptor()
    ];
  }

  // TODO display (or throw) warning that no tile layers are available and map.tilemap needs to be configured
  // because EMS is unreachable or has been turned off on purpose.
  return [];
}
