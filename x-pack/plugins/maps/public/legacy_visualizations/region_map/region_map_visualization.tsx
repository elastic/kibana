/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { Filter } from '@kbn/es-query';
import type { Query, TimeRange } from '@kbn/es-query';
import { RegionMapVisConfig } from './types';
import { MapComponent } from '../../embeddable/map_component';
import { createRegionMapLayerDescriptor } from '../../classes/layers/create_region_map_layer_descriptor';

interface Props {
  filters?: Filter[];
  query?: Query;
  timeRange?: TimeRange;
  visConfig: RegionMapVisConfig;
  onInitialRenderComplete: () => void;
}

export function RegionMapVisualization(props: Props) {
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
    const layerDescriptor = createRegionMapLayerDescriptor(props.visConfig.layerDescriptorParams);
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
