/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useRef, useEffect } from 'react';
import uuid from 'uuid';
import {
  ErrorEmbeddable,
  ViewMode,
  isErrorEmbeddable,
} from '../../../../../../../../src/plugins/embeddable/public';
import {
  MapEmbeddable,
  MapEmbeddableInput,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../../../maps/public/embeddable';
import { useMlKibana } from '../../../contexts/kibana';
import { MAP_SAVED_OBJECT_TYPE } from '../../../../../../maps/common/constants';
import { LayerDescriptor } from '../../../../../../maps/common/descriptor_types';
import { getMLAnomaliesActualLayer, getMLAnomaliesTypicalLayer } from './map_config';
import { AnomalyRecordDoc } from '../../../../../common/types/anomalies';

export function EmbeddedMapComponent({ anomalies }: { anomalies: AnomalyRecordDoc[] }) {
  const [embeddable, setEmbeddable] = useState<MapEmbeddable | ErrorEmbeddable | undefined>();

  const embeddableRoot: React.RefObject<HTMLDivElement> = useRef<HTMLDivElement>(null);
  const layerList = useRef<LayerDescriptor[]>([]);

  const {
    services: { embeddable: embeddablePlugin, maps: mapsPlugin },
  } = useMlKibana();

  if (!embeddablePlugin) {
    throw new Error('Embeddable start plugin not found');
  }
  if (!mapsPlugin) {
    throw new Error('Maps start plugin not found');
  }

  const factory: any = embeddablePlugin.getEmbeddableFactory(MAP_SAVED_OBJECT_TYPE);

  const input: MapEmbeddableInput = {
    id: uuid.v4(),
    attributes: { title: '' },
    filters: [],
    hidePanelTitles: true,
    refreshConfig: {
      value: 0,
      pause: false,
    },
    viewMode: ViewMode.VIEW,
    isLayerTOCOpen: false,
    hideFilterActions: true,
    // Zoom Lat/Lon values are set to make sure map is in center in the panel
    // It will also omit Greenland/Antarctica etc. NOTE: Can be removed when initialLocation is set
    mapCenter: {
      lon: 11,
      lat: 20,
      zoom: 1,
    },
    // can use mapSettings to center map on anomalies
    mapSettings: {
      disableInteractive: false,
      hideToolbarOverlay: true,
      hideLayerControl: false,
      hideViewControl: false,
      // Doesn't currently work with GEO_JSON. Will uncomment when https://github.com/elastic/kibana/pull/88294 is in
      // initialLocation: INITIAL_LOCATION.AUTO_FIT_TO_BOUNDS, // this will startup based on data-extent
      // autoFitToDataBounds: true, // this will auto-fit when there are changes to the filter and/or query
    },
  };

  // Update the layer list  with updated geo points upon refresh
  useEffect(() => {
    if (embeddable && !isErrorEmbeddable(embeddable) && anomalies && anomalies.length > 0) {
      layerList.current = [
        layerList.current[0],
        getMLAnomaliesActualLayer(anomalies),
        getMLAnomaliesTypicalLayer(anomalies),
      ];
      embeddable.setLayerList(layerList.current);
    }
  }, [embeddable, anomalies]);

  useEffect(() => {
    async function setupEmbeddable() {
      if (!factory) {
        throw new Error('Map embeddable not found.');
      }
      const embeddableObject: any = await factory.create({
        ...input,
        title: 'Explorer map',
      });

      if (embeddableObject && !isErrorEmbeddable(embeddableObject)) {
        const basemapLayerDescriptor = mapsPlugin
          ? await mapsPlugin.createLayerDescriptors.createBasemapLayerDescriptor()
          : null;

        if (basemapLayerDescriptor) {
          layerList.current = [basemapLayerDescriptor];
          await embeddableObject.setLayerList(layerList.current);
        }
      }

      setEmbeddable(embeddableObject);
    }

    setupEmbeddable();
    // we want this effect to execute exactly once after the component mounts
  }, []);

  // We can only render after embeddable has already initialized
  useEffect(() => {
    if (embeddableRoot?.current && embeddable) {
      embeddable.render(embeddableRoot.current);
    }
  }, [embeddable, embeddableRoot, anomalies]);

  return (
    <div
      className={'mlFieldDataCard__geoContent'}
      style={{
        width: '100%',
        height: 300,
      }}
    >
      <div
        data-test-subj="xpack.ml.explorer.embeddedMapPanel"
        className="embPanel__content"
        ref={embeddableRoot}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flex: '1 1 100%',
          zIndex: 1,
          minHeight: 0, // Absolute must for Firefox to scroll contents
        }}
      />
    </div>
  );
}
