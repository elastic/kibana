/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from 'styled-components';

import type { RenderTooltipContentParams } from '@kbn/maps-plugin/public';
import { useLayerList } from './use_layer_list';
import { useLegacyUrlParams } from '../../../../context/url_params_context/use_url_params';
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
  &&& .maplibregl-canvas {
    animation: none !important;
  }
`;

export function EmbeddedMapComponent() {
  const { urlParams } = useLegacyUrlParams();

  const { start, end, serviceName } = urlParams;

  const mapFilters = useMapFilters();

  const layerList = useLayerList();

  const { maps } = useKibanaServices();

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

  return (
    <EmbeddedPanel>
      <div data-test-subj="xpack.ux.regionMap.embeddedPanel" className="embPanel__content">
        {serviceName &&
          maps &&
          maps.Map({
            title: 'Visitors by region',
            filters: mapFilters,
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
            layerList,
            getTooltipRenderer: () => renderTooltipContent,
          })}
      </div>
    </EmbeddedPanel>
  );
}

EmbeddedMapComponent.displayName = 'EmbeddedMap';

export const EmbeddedMap = React.memo(EmbeddedMapComponent);
