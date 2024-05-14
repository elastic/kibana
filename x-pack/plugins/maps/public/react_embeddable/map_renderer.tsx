/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import useMountedState from 'react-use/lib/useMountedState';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import { ReactEmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import { BehaviorSubject } from 'rxjs';
import type { LayerDescriptor, MapCenterAndZoom, MapSettings } from '../../common/descriptor_types';
import { createBasemapLayerDescriptor } from '../classes/layers/create_basemap_layer_descriptor';
import { MapApi, MapSerializedState } from './types';
import { MAP_SAVED_OBJECT_TYPE } from '../../common/constants';
import { RenderToolTipContent } from '../classes/tooltips/tooltip_property';

function getLayers(layerList: LayerDescriptor[]) {
  const basemapLayer = createBasemapLayerDescriptor();
  return basemapLayer ? [basemapLayer, ...layerList] : layerList;
}

export interface Props {
  title?: string;
  filters?: Filter[];
  query?: Query;
  timeRange?: TimeRange;
  layerList: LayerDescriptor[];
  mapSettings?: Partial<MapSettings>;
  hideFilterActions?: boolean;
  isLayerTOCOpen?: boolean;
  mapCenter?: MapCenterAndZoom;
  getTooltipRenderer?: () => RenderToolTipContent;
  onApiAvailable?: (api: MapApi) => void;
  /*
   * Set to false to exclude sharing attributes 'data-*'.
   */
  isSharable?: boolean;
}

export function MapRenderer(props: Props) {
  const isMounted = useMountedState();
  const mapApiRef = useRef<MapApi | undefined>(undefined);
  const beforeApiReadyLayerListRef = useRef<LayerDescriptor[] | undefined>(undefined);

  const initialState = useMemo(() => {
    const rawState: MapSerializedState = {
      attributes: {
        title: props.title ?? '',
        layerListJSON: JSON.stringify(getLayers(props.layerList)),
      },
      hidePanelTitles: !Boolean(props.title),
      isLayerTOCOpen: typeof props.isLayerTOCOpen === 'boolean' ? props.isLayerTOCOpen : false,
      hideFilterActions:
        typeof props.hideFilterActions === 'boolean' ? props.hideFilterActions : false,
      mapCenter: props.mapCenter,
      mapSettings: props.mapSettings ?? {},
      isSharable: props.isSharable,
    };
    if (props.getTooltipRenderer) {
      rawState.tooltipRenderer = props.getTooltipRenderer();
    }
    return {
      rawState,
      references: [],
    };
    // only run onMount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mapApiRef.current) {
      mapApiRef.current.setLayerList(getLayers(props.layerList));
    } else {
      beforeApiReadyLayerListRef.current = getLayers(props.layerList);
    }
  }, [props.layerList]);

  const parentApi = useMemo(() => {
    return {
      filters$: new BehaviorSubject(props.filters),
      query$: new BehaviorSubject(props.query),
      timeRange$: new BehaviorSubject(props.timeRange),
    };
    // only run onMount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    parentApi.filters$.next(props.filters);
  }, [props.filters, parentApi.filters$]);
  useEffect(() => {
    parentApi.query$.next(props.query);
  }, [props.query, parentApi.query$]);
  useEffect(() => {
    parentApi.timeRange$.next(props.timeRange);
  }, [props.timeRange, parentApi.timeRange$]);

  return (
    <div className="mapEmbeddableContainer">
      <ReactEmbeddableRenderer<MapSerializedState, MapApi>
        type={MAP_SAVED_OBJECT_TYPE}
        state={initialState}
        parentApi={parentApi}
        onApiAvailable={(api) => {
          mapApiRef.current = api;
          if (beforeApiReadyLayerListRef.current) {
            api.setLayerList(beforeApiReadyLayerListRef.current);
          }

          if (props.onApiAvailable) {
            props.onApiAvailable(api);
          }
        }}
        hidePanelChrome={true}
      />
    </div>
  );
}
