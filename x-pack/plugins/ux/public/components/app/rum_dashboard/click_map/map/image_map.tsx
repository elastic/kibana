/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import styled from 'styled-components';
import {
  Map as MLMap,
  Marker as MLMarker,
  ImageSourceSpecification,
} from 'maplibre-gl';

import { MapEmbeddable, MapEmbeddableInput } from '@kbn/maps-plugin/public';
import { MAP_SAVED_OBJECT_TYPE } from '@kbn/maps-plugin/common';
import { ErrorEmbeddable, ViewMode } from '@kbn/embeddable-plugin/public';
import { useLegacyUrlParams } from '../../../../../context/url_params_context/use_url_params';
import { useMapFilters } from './use_map_filters';
import { useKibanaServices } from '../../../../../hooks/use_kibana_services';

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

export function EmbeddedMapComponent() {
  const { rangeId: _rangeId, urlParams } = useLegacyUrlParams();

  const { start, end, serviceName } = urlParams;

  const mapFilters = useMapFilters();

  const [embeddable, setEmbeddable] = useState<
    MapEmbeddable | ErrorEmbeddable | undefined
  >();

  const embeddableRoot: React.RefObject<HTMLDivElement> =
    useRef<HTMLDivElement>(null);

  const { embeddable: embeddablePlugin, maps: _maps } = useKibanaServices();

  if (!embeddablePlugin) {
    throw new Error('Embeddable start plugin not found');
  }
  const factory = embeddablePlugin.getEmbeddableFactory(MAP_SAVED_OBJECT_TYPE);

  const input: MapEmbeddableInput = {
    attributes: { title: '' },
    id: uuidv4(),
    filters: mapFilters,
    viewMode: ViewMode.VIEW,
    isLayerTOCOpen: false,
    query: {
      query: 'transaction.type : "page-load"',
      language: 'kuery',
    },
    ...(start && {
      timeRange: {
        from: new Date(start!).toISOString(),
        to: new Date(end!).toISOString(),
      },
    }),
    hideFilterActions: true,
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
    if (embeddableRoot.current && embeddable && serviceName) {
      const map = new MLMap({
        container: embeddableRoot.current,
        style:
          'https://api.maptiler.com/maps/basic/style.json?key=w2OlpIMnFnat92FgB2aI',
        center: [0, 0], // Initial center in pixels
        zoom: 2, // Initial zoom level
      });

      const imageSource = {
        type: 'image',
        url: 'path/to/your/image.jpg', // Replace with the path to your image
        coordinates: [
          [-100, 90], // Top-left coordinate
          [100, -90], // Bottom-right coordinate
        ],
      };

      map.on('load', () => {
        const marker = new MLMarker({
          color: '#FFFFFF',
          draggable: true,
        })
          .setLngLat(pixelsToLatLng([50, 50], map))
          .addTo(map);

        const marker2 = new MLMarker({
          color: '#FFFFFF',
          draggable: true,
        })
          .setLngLat([-151.5129, 63.1016])
          .addTo(map);

        map.addSource('syntheticsScreenshot', {
          type: 'image',
          url: 'https://static-www.elastic.co/v3/assets/bltefdd0b53724fa2ce/blt939dd55d89917037/618ac5794f03d1667573981e/screenshot-log-monitoring-integrations.png',
          coordinates: [
            [50, 50],
            [200, 50],
            [200, 200],
            [50, 200],
          ].map((coord) =>
            pixelsToLatLng(coord, map)
          ) as ImageSourceSpecification['coordinates'],
        });

        map.addLayer({
          id: 'syntheticsLayer',
          source: 'syntheticsScreenshot',
          type: 'raster',
          paint: {
            'raster-opacity': 1,
          },
        });

        map.addSource('earthquakes', {
          type: 'geojson',
          data: 'https://maplibre.org/maplibre-gl-js/docs/assets/earthquakes.geojson',
        });

        map.addLayer(
          {
            id: 'earthquakes-heat',
            type: 'heatmap',
            source: 'earthquakes',
            maxzoom: 9,
            paint: {
              // Increase the heatmap weight based on frequency and property magnitude
              'heatmap-weight': [
                'interpolate',
                ['linear'],
                ['get', 'mag'],
                0,
                0,
                6,
                1,
              ],
              // Increase the heatmap color weight weight by zoom level
              // heatmap-intensity is a multiplier on top of heatmap-weight
              'heatmap-intensity': [
                'interpolate',
                ['linear'],
                ['zoom'],
                0,
                1,
                9,
                3,
              ],
              // Color ramp for heatmap.  Domain is 0 (low) to 1 (high).
              // Begin color ramp at 0-stop with a 0-transparancy color
              // to create a blur-like effect.
              'heatmap-color': [
                'interpolate',
                ['linear'],
                ['heatmap-density'],
                0,
                'rgba(33,102,172,0)',
                0.2,
                'rgb(103,169,207)',
                0.4,
                'rgb(209,229,240)',
                0.6,
                'rgb(253,219,199)',
                0.8,
                'rgb(239,138,98)',
                1,
                'rgb(178,24,43)',
              ],
              // Adjust the heatmap radius by zoom level
              'heatmap-radius': [
                'interpolate',
                ['linear'],
                ['zoom'],
                0,
                2,
                9,
                20,
              ],
              // Transition from heatmap to circle layer by zoom level
              'heatmap-opacity': [
                'interpolate',
                ['linear'],
                ['zoom'],
                7,
                1,
                9,
                0,
              ],
            },
          },
          'waterway'
        );
      });

      console.log(map);
    }
  }, [embeddable, embeddableRoot, serviceName]);

  return (
    <div style={{ height: 400, width: '100%' }}>
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

export const EmbeddedMap = React.memo(EmbeddedMapComponent);

function pixelsToLatLng(pixel: number[], map: MLMap) {
  const lngLat = map.unproject([pixel[0], pixel[1]]);

  return [lngLat.lng, lngLat.lat] as [number, number];
}
