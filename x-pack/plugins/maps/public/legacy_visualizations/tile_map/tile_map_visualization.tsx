/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Filter } from '@kbn/es-query';
import type { Query, TimeRange } from '../../../../../../src/plugins/data/common';
import { TileMapVisConfig } from './types';
import type { LazyLoadedMapModules } from '../../lazy_load_bundle';
import { MapComponent } from '../../embeddable/map_component';

interface Props {
  filters?: Filter[];
  query?: Query;
  timeRange?: TimeRange;
  visConfig: TileMapVisConfig;
  onInitialRenderComplete: () => void;
}

function TileMapVisualization(props: Props) {
  const mapCenter = {
    lat: props.visConfig.mapCenter[0],
    lon: props.visConfig.mapCenter[1],
    zoom: props.visConfig.mapZoom,
  };
  function getLayerDescriptors({
    createTileMapLayerDescriptor,
  }: {
    createTileMapLayerDescriptor: LazyLoadedMapModules['createTileMapLayerDescriptor'];
  }) {
    const layerDescriptor = createTileMapLayerDescriptor(props.visConfig.layerDescriptorParams);
    return layerDescriptor ? [layerDescriptor] : [];
  }
  return (
    <MapComponent
      filters={props.filters}
      query={props.query}
      timeRange={props.timeRange}
      mapCenter={mapCenter}
      getLayerDescriptors={getLayerDescriptors}
      onInitialRenderComplete={props.onInitialRenderComplete}
      isSharable={false}
    />
  );
}

// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export default TileMapVisualization;
