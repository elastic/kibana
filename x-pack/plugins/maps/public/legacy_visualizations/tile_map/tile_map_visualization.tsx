/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { Filter } from '@kbn/es-query';
import type { Query, TimeRange } from '@kbn/es-query';
import type { TileMapVisConfig } from './types';
import { MapComponent } from '../../embeddable/map_component';
import { createTileMapLayerDescriptor } from '../../classes/layers/create_tile_map_layer_descriptor';

interface Props {
  filters?: Filter[];
  query?: Query;
  timeRange?: TimeRange;
  visConfig: TileMapVisConfig;
  onInitialRenderComplete: () => void;
}

export function TileMapVisualization(props: Props) {
  const initialMapCenter = useMemo(() => {
    return {
      lat: props.visConfig.mapCenter[0],
      lon: props.visConfig.mapCenter[1],
      zoom: props.visConfig.mapZoom,
    };
    // props.visConfig reference changes each render but values are the same
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const initialLayerList = useMemo(() => {
    const layerDescriptor = createTileMapLayerDescriptor(props.visConfig.layerDescriptorParams);
    return layerDescriptor ? [layerDescriptor] : [];
    // props.visConfig reference changes each render but values are the same
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <MapComponent
      title={props.visConfig.layerDescriptorParams.label}
      filters={props.filters}
      query={props.query}
      timeRange={props.timeRange}
      mapCenter={initialMapCenter}
      isLayerTOCOpen={true}
      layerList={initialLayerList}
      onInitialRenderComplete={props.onInitialRenderComplete}
      isSharable={false}
    />
  );
}
