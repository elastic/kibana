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
import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public';
import {
  ErrorEmbeddable,
  ViewMode,
  isErrorEmbeddable,
} from '../../../../../../../../src/plugins/embeddable/public';
import { useLayerList } from './useLayerList';
import { useUrlParams } from '../../../../context/url_params_context/use_url_params';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import type { RenderTooltipContentParams } from '../../../../../../maps/public';
import { MapToolTip } from './MapToolTip';
import { useMapFilters } from './useMapFilters';
import { EmbeddableStart } from '../../../../../../../../src/plugins/embeddable/public';

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

interface KibanaDeps {
  embeddable: EmbeddableStart;
}
export function EmbeddedMapComponent() {
  const { urlParams } = useUrlParams();
  const apmPluginContext = useApmPluginContext();

  const { start, end, serviceName } = urlParams;

  const mapFilters = useMapFilters();

  const layerList = useLayerList();

  const [embeddable, setEmbeddable] = useState<
    MapEmbeddable | ErrorEmbeddable | undefined
  >();

  const embeddableRoot: React.RefObject<HTMLDivElement> =
    useRef<HTMLDivElement>(null);

  const {
    services: { embeddable: embeddablePlugin },
  } = useKibana<KibanaDeps>();

  if (!embeddablePlugin) {
    throw new Error('Embeddable start plugin not found');
  }
  const factory: any = embeddablePlugin.getEmbeddableFactory(
    MAP_SAVED_OBJECT_TYPE
  );

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
  }, [start, end]);

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
        const basemapLayerDescriptor = apmPluginContext.plugins.maps
          ? await apmPluginContext.plugins.maps.createLayerDescriptors.createBasemapLayerDescriptor()
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
        data-test-subj="xpack.apm.regionMap.embeddedPanel"
        className="embPanel__content"
        ref={embeddableRoot}
      />
    </EmbeddedPanel>
  );
}

EmbeddedMapComponent.displayName = 'EmbeddedMap';

export const EmbeddedMap = React.memo(EmbeddedMapComponent);
