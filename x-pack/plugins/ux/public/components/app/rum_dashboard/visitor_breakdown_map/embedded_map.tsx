/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, useRef } from 'react';
import uuid from 'uuid';
import styled from 'styled-components';

import {
  MapEmbeddable,
  MapEmbeddableInput,
} from '../../../../../../maps/public';
import { MAP_SAVED_OBJECT_TYPE } from '../../../../../../maps/common';
import {
  ErrorEmbeddable,
  ViewMode,
  isErrorEmbeddable,
} from '../../../../../../../../src/plugins/embeddable/public';
import { useLayerList } from './use_layer_list';
import { useLegacyUrlParams } from '../../../../context/url_params_context/use_url_params';
import type { RenderTooltipContentParams } from '../../../../../../maps/public';
import { MapToolTip } from './map_tooltip';
import { useMapFilters } from './use_map_filters';
import { useKibanaServices } from '../../../../hooks/use_kibana_services';

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
  &&& .mapboxgl-canvas {
    animation: none !important;
  }
`;

export function EmbeddedMapComponent() {
  const { rangeId, urlParams } = useLegacyUrlParams();

  const { start, end, serviceName } = urlParams;

  const mapFilters = useMapFilters();

  const layerList = useLayerList();

  const [embeddable, setEmbeddable] = useState<
    MapEmbeddable | ErrorEmbeddable | undefined
  >();

  const embeddableRoot: React.RefObject<HTMLDivElement> =
    useRef<HTMLDivElement>(null);

  const { embeddable: embeddablePlugin, maps } = useKibanaServices();

  if (!embeddablePlugin) {
    throw new Error('Embeddable start plugin not found');
  }
  const factory = embeddablePlugin.getEmbeddableFactory(MAP_SAVED_OBJECT_TYPE);

  const input: MapEmbeddableInput = {
    attributes: { title: '' },
    id: uuid.v4(),
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

  function renderTooltipContent({
    addFilters,
    closeTooltip,
    features,
    isLocked,
    getLayerName,
    loadFeatureProperties,
  }: RenderTooltipContentParams) {
    const props = {
      addFilters,
      closeTooltip,
      isLocked,
      getLayerName,
      loadFeatureProperties,
    };

    return <MapToolTip {...props} features={features} />;
  }

  useEffect(() => {
    if (embeddable != null && serviceName) {
      embeddable.updateInput({ filters: mapFilters });
      embeddable.reload();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapFilters]);

  // DateRange updated useEffect
  useEffect(() => {
    if (embeddable != null && start != null && end != null) {
      const timeRange = {
        from: new Date(start).toISOString(),
        to: new Date(end).toISOString(),
      };
      embeddable.updateInput({ timeRange });
      embeddable.reload();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, end, rangeId]);

  useEffect(() => {
    async function setupEmbeddable() {
      if (!factory) {
        throw new Error('Map embeddable not found.');
      }
      const embeddableObject: any = await factory.create({
        ...input,
        title: 'Visitors by region',
      });

      if (embeddableObject && !isErrorEmbeddable(embeddableObject)) {
        embeddableObject.setRenderTooltipContent(renderTooltipContent);
        const basemapLayerDescriptor = maps
          ? await maps.createLayerDescriptors.createBasemapLayerDescriptor()
          : null;
        if (basemapLayerDescriptor) {
          layerList.unshift(basemapLayerDescriptor);
        }
        await embeddableObject.setLayerList(layerList);
      }

      setEmbeddable(embeddableObject);
    }

    setupEmbeddable();

    // we want this effect to execute exactly once after the component mounts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // We can only render after embeddable has already initialized
  useEffect(() => {
    if (embeddableRoot.current && embeddable && serviceName) {
      embeddable.render(embeddableRoot.current);
    }
  }, [embeddable, embeddableRoot, serviceName]);

  return (
    <EmbeddedPanel>
      <div
        data-test-subj="xpack.ux.regionMap.embeddedPanel"
        className="embPanel__content"
        ref={embeddableRoot}
      />
    </EmbeddedPanel>
  );
}

EmbeddedMapComponent.displayName = 'EmbeddedMap';

export const EmbeddedMap = React.memo(EmbeddedMapComponent);
