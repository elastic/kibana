/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import { EuiColorPicker, EuiFlexItem, EuiFormRow, EuiPanel, EuiSpacer, useColorPickerState } from '@elastic/eui';
import { mapboxgl, Map as MapboxMap } from '@kbn/mapbox-gl';
// @ts-expect-error
import { createSdfIcon, getCustomIconId } from '../../symbol_utils';
import { EMPTY_IMAGE_SRC } from '../../../../../../common/constants';
import { MBMap } from '../../../../../connected_components/mb_map/';
import { MapContainer } from '../../../../../connected_components/map_container';
import { MapSettings } from '../../../../../reducers/map';
import { INITIAL_LOCATION } from '../../../../../../common/constants';

// export interface Props {
//   title: string;
// }

// export function IconPreview({ title }: Props) {

//   return (
//     <EuiFlexItem>
//         <MapContainer
//           addFilters={null}
//           title={title}
//         />
//     </EuiFlexItem>
//   );
// }

export interface Props {
  svg?: string;
}

export function IconPreview({ svg }: Props) {
  const [map, setMap] = useState<MapboxMap | null>(null);
  const mapContainer = useRef<HTMLDivElement | null>(null);

  const [color, setColor, errors] = useColorPickerState('#E7664C');
  const iconId = '__kbn__customIcon__iconPreview';

  useEffect(() => {
    const initializeMap = () => {
      const map: MapboxMap = new mapboxgl.Map({
        container: mapContainer.current,
        center: [0, 0],
        zoom: 2,
        style: {
          version: 8,
          name: 'Empty',
          sources: {},
          layers: [
            {
              id: 'background',
              type: 'background',
              paint: {
                'background-color': 'rgba(0,0,0,0)',
              },
            },
          ],
        },
      });

      map.on('load', () => {
        map.addLayer({
          id: 'icon-layer',
          type: 'symbol',
          source: {
            type: 'geojson',
            data: {
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: [0, 0],
              },
              properties: {},
            },
          },
        });
        setMap(map);
        map.resize();
      });
    };

    if (!map) initializeMap();
  }, [map]);

  useEffect(() => {
    if (!map) return;

    const addIconToMap = async (svg: string) => {
      const sdfImage = await createSdfIcon(svg);
      if (map.hasImage(iconId)) {
        // @ts-expect-error
        map.updateImage(iconId, sdfImage);
      } else {
        map.addImage(iconId, sdfImage, { sdf: true });
      }
      map.setLayoutProperty('icon-layer', 'icon-image', iconId);
      map.setPaintProperty('icon-layer', 'icon-halo-color', '#000000');
      map.setPaintProperty('icon-layer', 'icon-halo-width', 1);
      map.setPaintProperty('icon-layer', 'icon-color', color);
    };

    if (svg) addIconToMap(svg);
  });

  return (
    <div>
      <EuiFlexItem>
        <EuiPanel>
          <div
            data-test-subj="mapsCustomIconPreview"
            className="mapsCustomIconPreview__mapContainer"
            ref={mapContainer}
          />
        </EuiPanel>
      </EuiFlexItem>
      <EuiSpacer />
      <EuiFlexItem>
        <EuiFormRow label='Icon color'>
          <EuiColorPicker onChange={setColor} color={color} isInvalid={!!errors} />
        </EuiFormRow>
      </EuiFlexItem>
    </div>
  );
}
