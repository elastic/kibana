/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef } from 'react';
import useMountedState from 'react-use/lib/useMountedState';
import { Subscription } from 'rxjs';
import { ReactEmbeddableRenderer, ViewMode } from '@kbn/embeddable-plugin/public';
import type { LayerDescriptor } from '../../common/descriptor_types';
import { INITIAL_LOCATION, MAP_SAVED_OBJECT_TYPE } from '../../common';
import { createBasemapLayerDescriptor } from '../classes/layers/create_basemap_layer_descriptor';
import { MapApi, MapRuntimeState, MapSerializedState } from '../react_embeddable/types';

export interface Props {
  passiveLayer: LayerDescriptor;
  onRenderComplete?: () => void;
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
  const beforeApiReadyPassiveLayerRef = useRef<LayerDescriptor | undefined>(undefined);
  const onRenderCompleteSubscriptionRef = useRef<Subscription | undefined>(undefined);

  useEffect(() => {
    if (mapApiRef.current) {
      mapApiRef.current.updateLayerById(props.passiveLayer);
    } else {
      beforeApiReadyPassiveLayerRef.current = props.passiveLayer;
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
      <ReactEmbeddableRenderer<MapSerializedState, MapRuntimeState, MapApi>
        type={MAP_SAVED_OBJECT_TYPE}
        getParentApi={() => ({
          hideFilterActions: true,
          getSerializedStateForChild: () => {
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
                mapSettings: {
                  disableInteractive: false,
                  hideToolbarOverlay: false,
                  hideLayerControl: false,
                  hideViewControl: false,
                  initialLocation: INITIAL_LOCATION.AUTO_FIT_TO_BOUNDS, // this will startup based on data-extent
                  autoFitToDataBounds: true, // this will auto-fit when there are changes to the filter and/or query
                },
              },
              references: [],
            };
          },
        })}
        onApiAvailable={(api) => {
          mapApiRef.current = api;
          if (beforeApiReadyPassiveLayerRef.current) {
            api.updateLayerById(beforeApiReadyPassiveLayerRef.current);
          }
          if (props.onRenderComplete) {
            onRenderCompleteSubscriptionRef.current = api.onRenderComplete$.subscribe(() => {
              if (isMounted() && props.onRenderComplete) {
                props.onRenderComplete();
              }
            });
          }
        }}
        hidePanelChrome={true}
      />
    </div>
  );
}
