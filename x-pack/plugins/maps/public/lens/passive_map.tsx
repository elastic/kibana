/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import useMountedState from 'react-use/lib/useMountedState';
import { Subscription } from 'rxjs';
import { ReactEmbeddableRenderer, ViewMode } from '@kbn/embeddable-plugin/public';
import type { LayerDescriptor } from '../../common/descriptor_types';
import { INITIAL_LOCATION, MAP_SAVED_OBJECT_TYPE } from '../../common';
import { createBasemapLayerDescriptor } from '../classes/layers/create_basemap_layer_descriptor';
import { MapApi, MapSerializeState } from '../react_embeddable/types';

interface Props {
  passiveLayer: LayerDescriptor;
  onRenderComplete: () => void;
}

/*
 * PassiveMap compoment is a wrapper around a map embeddable where passive layer descriptor provides features
 * and layer does not auto-fetch features based on changes to pan, zoom, filter, query, timeRange, and other state changes.
 * To update features, update passiveLayer prop with new layer descriptor.
 * Contrast with traditional map (active map), where layers independently auto-fetch features
 * based on changes to pan, zoom, filter, query, timeRange, and other state changes
 */
export function PassiveMap(props: Props) {
  const isMounted = useMountedState();
  const mapApiRef = useRef<MapApi | undefined>(undefined);
  const onRenderCompleteSubscriptionRef = useRef<Subscription | undefined>(undefined);
  const initialState = useMemo(() => {
    const basemapLayerDescriptor = createBasemapLayerDescriptor();
    const intialLayers = basemapLayerDescriptor ? [basemapLayerDescriptor] : [];
    return {
      rawState: {
        attributes: {
          title: '',
          layerListJSON: JSON.stringify([...intialLayers, props.passiveLayer]),
        },
        filters: [],
        hidePanelTitles: true,
        viewMode: ViewMode.VIEW,
        isLayerTOCOpen: false,
        hideFilterActions: true,
        mapSettings: {
          disableInteractive: false,
          hideToolbarOverlay: false,
          hideLayerControl: false,
          hideViewControl: false,
          initialLocation: INITIAL_LOCATION.AUTO_FIT_TO_BOUNDS, // this will startup based on data-extent
          autoFitToDataBounds: true, // this will auto-fit when there are changes to the filter and/or query
        },
        isSharable: false,
      },
      references: [],
    };
    // only run onMount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mapApiRef.current) {
      mapApiRef.current.updateLayerById(props.passiveLayer);
    }
  }, [props.passiveLayer]);

  useEffect(() => {
    return () => {
      if (onRenderCompleteSubscriptionRef.current) {
        onRenderCompleteSubscriptionRef.current.unsubscribe();
      }
    };
  }, []);

  return (
    <div className="mapEmbeddableContainer">
      <ReactEmbeddableRenderer<MapSerializeState, MapApi>
        type={MAP_SAVED_OBJECT_TYPE}
        state={initialState}
        onApiAvailable={(api) => {
          mapApiRef.current = api;
          onRenderCompleteSubscriptionRef.current = api.onRenderComplete$.subscribe(() => {
            if (isMounted()) {
              props.onRenderComplete();
            }
          });
        }}
        panelProps={{
          hideHeader: true,
        }}
      />
    </div>
  );
}
