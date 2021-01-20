/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useRef, useState } from 'react';
import uuid from 'uuid';
import { LayerDescriptor } from '../../../../../maps/common/descriptor_types';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { MapEmbeddable, MapEmbeddableInput } from '../../../../../maps/public/embeddable';
import { MAP_SAVED_OBJECT_TYPE, RenderTooltipContentParams } from '../../../../../maps/public';
import {
  ErrorEmbeddable,
  isErrorEmbeddable,
  ViewMode,
} from '../../../../../../../src/plugins/embeddable/public';
import { useMlKibana } from '../../contexts/kibana';

const renderTooltipContent = (params: RenderTooltipContentParams) => {
  return <div>Test</div>;
};

export function MlEmbeddedMapComponent({
  layerList,
  mapEmbeddableInput,
}: // renderTooltipContent,
{
  layerList: LayerDescriptor[];
  mapEmbeddableInput?: MapEmbeddableInput;
  renderTooltipContent?: (params: RenderTooltipContentParams) => React.ReactNode;
}) {
  const [embeddable, setEmbeddable] = useState<MapEmbeddable | ErrorEmbeddable | undefined>();

  const embeddableRoot: React.RefObject<HTMLDivElement> = useRef<HTMLDivElement>(null);
  const baseLayers = useRef<LayerDescriptor[]>();

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

  // Update the layer list  with updated geo points upon refresh
  useEffect(() => {
    async function updateIndexPatternSearchLayer() {
      if (
        embeddable &&
        !isErrorEmbeddable(embeddable) &&
        Array.isArray(layerList) &&
        Array.isArray(baseLayers.current)
      ) {
        embeddable.setLayerList([...baseLayers.current, ...layerList]);
      }
    }
    updateIndexPatternSearchLayer();
  }, [embeddable, layerList]);

  useEffect(() => {
    async function setupEmbeddable() {
      if (!factory) {
        throw new Error('Map embeddable not found.');
      }
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

      const embeddableObject: any = await factory.create(input);

      if (embeddableObject && !isErrorEmbeddable(embeddableObject)) {
        if (renderTooltipContent !== undefined) {
          embeddableObject.setRenderTooltipContent(renderTooltipContent);
        }
        const basemapLayerDescriptor = mapsPlugin
          ? await mapsPlugin.createLayerDescriptors.createBasemapLayerDescriptor()
          : null;

        if (basemapLayerDescriptor) {
          baseLayers.current = [basemapLayerDescriptor];
          await embeddableObject.setLayerList(baseLayers.current);
        }
      }

      setEmbeddable(embeddableObject);
    }

    setupEmbeddable();
    // we want this effect to execute exactly once after the component mounts
  }, []);

  useEffect(() => {
    async function updateInput() {
      if (embeddable && !isErrorEmbeddable(embeddable) && mapEmbeddableInput !== undefined) {
        await embeddable.updateInput(mapEmbeddableInput);
      }
    }
    updateInput();
  }, [embeddable, mapEmbeddableInput]);

  // We can only render after embeddable has already initialized
  useEffect(() => {
    if (embeddableRoot.current && embeddable) {
      embeddable.render(embeddableRoot.current);
    }
  }, [embeddable, embeddableRoot]);

  return (
    <div
      data-test-subj="xpack.ml.datavisualizer.embeddedMapPanel"
      className="mlEmbeddedMapContent"
      ref={embeddableRoot}
    />
  );
}
