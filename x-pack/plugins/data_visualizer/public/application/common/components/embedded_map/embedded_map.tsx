/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';

import { htmlIdGenerator } from '@elastic/eui';
import { INITIAL_LOCATION, LayerDescriptor } from '../../../../../../maps/common';
import {
  MapEmbeddable,
  MapEmbeddableInput,
  MapEmbeddableOutput,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../../../maps/public/embeddable';
import { MAP_SAVED_OBJECT_TYPE, RenderTooltipContentParams } from '../../../../../../maps/public';
import {
  EmbeddableFactory,
  ErrorEmbeddable,
  isErrorEmbeddable,
  ViewMode,
} from '../../../../../../../../src/plugins/embeddable/public';
import { useDataVisualizerKibana } from '../../../kibana_context';
import './_embedded_map.scss';

export function EmbeddedMapComponent({
  layerList,
  mapEmbeddableInput,
  renderTooltipContent,
}: {
  layerList: LayerDescriptor[];
  mapEmbeddableInput?: MapEmbeddableInput;
  renderTooltipContent?: (params: RenderTooltipContentParams) => JSX.Element;
}) {
  const [embeddable, setEmbeddable] = useState<ErrorEmbeddable | MapEmbeddable | undefined>();

  const embeddableRoot: React.RefObject<HTMLDivElement> = useRef<HTMLDivElement>(null);
  const baseLayers = useRef<LayerDescriptor[]>();

  const {
    services: { embeddable: embeddablePlugin, maps: mapsPlugin, data },
  } = useDataVisualizerKibana();

  const factory:
    | EmbeddableFactory<MapEmbeddableInput, MapEmbeddableOutput, MapEmbeddable>
    | undefined = embeddablePlugin
    ? embeddablePlugin.getEmbeddableFactory(MAP_SAVED_OBJECT_TYPE)
    : undefined;

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
        // eslint-disable-next-line no-console
        console.error('Map embeddable not found.');
        return;
      }
      const input: MapEmbeddableInput = {
        id: htmlIdGenerator()(),
        attributes: { title: '' },
        filters: data.query.filterManager.getFilters() ?? [],
        hidePanelTitles: true,
        viewMode: ViewMode.VIEW,
        isLayerTOCOpen: false,
        hideFilterActions: true,
        // can use mapSettings to center map on anomalies
        mapSettings: {
          disableInteractive: false,
          hideToolbarOverlay: false,
          hideLayerControl: false,
          hideViewControl: false,
          initialLocation: INITIAL_LOCATION.AUTO_FIT_TO_BOUNDS, // this will startup based on data-extent
          autoFitToDataBounds: true, // this will auto-fit when there are changes to the filter and/or query
        },
      };

      const embeddableObject = await factory.create(input);

      if (embeddableObject && !isErrorEmbeddable(embeddableObject)) {
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
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (embeddable && !isErrorEmbeddable(embeddable) && mapEmbeddableInput !== undefined) {
      embeddable.updateInput(mapEmbeddableInput);
    }
  }, [embeddable, mapEmbeddableInput]);

  useEffect(() => {
    if (embeddable && !isErrorEmbeddable(embeddable) && renderTooltipContent !== undefined) {
      embeddable.setRenderTooltipContent(renderTooltipContent);
    }
  }, [embeddable, renderTooltipContent]);

  // We can only render after embeddable has already initialized
  useEffect(() => {
    if (embeddableRoot.current && embeddable) {
      embeddable.render(embeddableRoot.current);
    }
  }, [embeddable, embeddableRoot]);

  if (!embeddablePlugin) {
    // eslint-disable-next-line no-console
    console.error('Embeddable start plugin not found');
    return null;
  }
  if (!mapsPlugin) {
    // eslint-disable-next-line no-console
    console.error('Maps start plugin not found');
    return null;
  }

  return (
    <div
      data-test-subj="dataVisualizerEmbeddedMapContent"
      className="embeddedMap__content"
      ref={embeddableRoot}
    />
  );
}
