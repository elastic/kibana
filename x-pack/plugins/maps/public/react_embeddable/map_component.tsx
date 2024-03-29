/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import useMountedState from 'react-use/lib/useMountedState';
import { first } from 'rxjs/operators';
import type { Filter } from '@kbn/es-query';
import type { Query, TimeRange } from '@kbn/es-query';
import { ReactEmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import { BehaviorSubject } from 'rxjs';
import type { LayerDescriptor, MapCenterAndZoom } from '../../common/descriptor_types';
import { createBasemapLayerDescriptor } from '../classes/layers/create_basemap_layer_descriptor';
import { MapApi, MapSerializeState } from './types';
import { MAP_SAVED_OBJECT_TYPE } from '../../common/constants';

interface Props {
  title: string;
  filters?: Filter[];
  query?: Query;
  timeRange?: TimeRange;
  getLayerDescriptors: () => LayerDescriptor[];
  mapCenter?: MapCenterAndZoom;
  onInitialRenderComplete?: () => void;
  /*
   * Set to false to exclude sharing attributes 'data-*'.
   */
  isSharable?: boolean;
}

export function MapComponent(props: Props) {
  const isMounted = useMountedState();
  const initialState = useMemo(() => {
    return {
      rawState: {
        attributes: {
          title: props.title,
          layerListJSON: JSON.stringify([
            createBasemapLayerDescriptor(),
            ...props.getLayerDescriptors(),
          ]),
        },
        mapCenter: props.mapCenter,
        isSharable: props.isSharable,
      },
      references: [],
    };
    // only run onMount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      <ReactEmbeddableRenderer<MapSerializeState, MapApi>
        type={MAP_SAVED_OBJECT_TYPE}
        state={initialState}
        parentApi={parentApi}
        onApiAvailable={(api) => {
          if (props.onInitialRenderComplete) {
            api.onRenderComplete$.pipe(first()).subscribe(() => {
              if (props.onInitialRenderComplete && isMounted()) {
                props.onInitialRenderComplete();
              }
            });
          }
        }}
        panelProps={{
          hideHeader: true,
        }}
      />
    </div>
  );
}
