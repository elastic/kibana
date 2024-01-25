/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import styled from 'styled-components';

import { MapEmbeddable, MapEmbeddableInput } from '@kbn/maps-plugin/public';
import { MAP_SAVED_OBJECT_TYPE } from '@kbn/maps-plugin/common';
import { ErrorEmbeddable, ViewMode } from '@kbn/embeddable-plugin/public';
import {
  addSyntheticsScreenshotRasterLayer,
  removeSyntheticsScreenshotRasterLayer,
} from './synthetics_raster_layer';
import {
  addClicksFeatureLayer,
  removeClicksFeatureLayer,
} from './clicks_feature_layer';
import { MLMap, paintMapWithBackgroundColor } from './helpers';
import { useKibanaServices } from '../../../../../hooks/use_kibana_services';

import { MAX_BOUNDS_EXTENDED } from './constants';

const EmbeddedPanel = styled.div`
  z-index: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
  .embPanel__content {
    display: flex;
    flex: 1 1 100%;
    z-index: 1;
    min-height: 0; // Absolute must for Firefox to scroll contents
  }
  &&& .maplibregl-canvas {
    animation: none !important;
  }
`;

interface ImageMapProps {
  width?: number | string;
  height?: number | string;
  imageUrl: string;
  viewportWidth: number;
  viewportHeight: number;

  /**
   * Untransformed coordinates captured w.r.t captureWidth (innerWidth) and captureHeight (innerHeight).
   */
  clickCoordinates: Array<{ x: number; y: number }>;
  captureWidth: number;
  captureHeight: number;
}

export function EmbeddedMapComponent({
  width = '100%',
  height = 400,
  imageUrl,
  viewportWidth,
  viewportHeight,
  clickCoordinates,
  captureWidth,
  captureHeight,
}: ImageMapProps) {
  const [embeddable, setEmbeddable] = useState<
    MapEmbeddable | ErrorEmbeddable | undefined
  >();

  const embeddableRoot: React.RefObject<HTMLDivElement> =
    useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap>(null);

  const { embeddable: embeddablePlugin, maps: _maps } = useKibanaServices();

  if (!embeddablePlugin) {
    throw new Error('Embeddable start plugin not found');
  }
  const factory = embeddablePlugin.getEmbeddableFactory(MAP_SAVED_OBJECT_TYPE);

  const input: MapEmbeddableInput = {
    attributes: { title: '' },
    id: uuidv4(),
    filters: [],
    viewMode: ViewMode.VIEW,
    isLayerTOCOpen: false,
    query: {
      query: 'transaction.type : "page-load"',
      language: 'kuery',
    },
    hideFilterActions: true,
  };

  const destroyMap = () => {
    if (mapRef.current) {
      mapRef.current?.remove();
      // @ts-ignore
      mapRef.current = null;
    }
  };

  useEffect(() => {
    async function setupEmbeddable() {
      if (!factory) {
        throw new Error('Map embeddable not found.');
      }
      const embeddableObject: any = await factory.create({
        ...input,
        title: 'Website visits',
      });

      setEmbeddable(embeddableObject);
    }

    setupEmbeddable();

    // we want this effect to execute exactly once after the component mounts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // We can only render after embeddable has already initialized
  useEffect(() => {
    if (
      embeddableRoot.current &&
      embeddable &&
      captureHeight &&
      captureWidth &&
      clickCoordinates &&
      viewportHeight &&
      viewportWidth &&
      imageUrl
    ) {
      const oldMap = mapRef.current;
      const map = new MLMap({
        container: embeddableRoot.current,
        style:
          'https://openmaptiles.github.io/osm-bright-gl-style/style-cdn.json',
        center: [0, 0], // Initial center in pixels
        zoom: 2, // Initial zoom level
        maxBounds: MAX_BOUNDS_EXTENDED,
      });
      // @ts-ignore
      mapRef.current = map;

      map.on('load', () => {
        // map.fitBounds(MAX_BOUNDS, { padding: 20 });
        removeClicksFeatureLayer(map);
        addClicksFeatureLayer(
          map,
          captureWidth,
          captureHeight,
          viewportWidth,
          viewportHeight,
          clickCoordinates
        );
        removeSyntheticsScreenshotRasterLayer(map);
        addSyntheticsScreenshotRasterLayer(
          map,
          viewportWidth,
          viewportHeight,
          imageUrl
        );
        paintMapWithBackgroundColor(map, 'white');
      });

      oldMap?.remove();
    }

    if (mapRef.current) {
      mapRef.current.repaint = true;
    }
  }, [
    embeddable,
    embeddableRoot,
    captureHeight,
    captureWidth,
    clickCoordinates,
    viewportHeight,
    viewportWidth,
    imageUrl,
  ]);

  useEffect(() => {
    // Destroy map if component get removed from DOM
    return () => {
      destroyMap();
    };
  }, []);

  return (
    <div style={{ height, width }}>
      <EmbeddedPanel>
        <div
          data-test-subj="xpack.ux.regionMap.embeddedPanel"
          className="embPanel__content"
          ref={embeddableRoot}
        />
      </EmbeddedPanel>
    </div>
  );
}

EmbeddedMapComponent.displayName = 'EmbeddedMap';

export const ImageMap = React.memo(EmbeddedMapComponent);
