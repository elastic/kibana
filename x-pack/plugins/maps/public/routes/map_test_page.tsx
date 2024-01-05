/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { BehaviorSubject } from 'rxjs';
import { Provider } from 'react-redux';
import { EuiEmptyPrompt, EuiTitle } from '@elastic/eui';
import {
  CreateEmbeddableComponent,
  // you might need to export this in src/plugins/embeddable/public/index.ts
  EmbeddableComponentFactory,
} from '@kbn/embeddable-plugin/public';
import { PresentationPanel } from '@kbn/presentation-panel-plugin/public';
import { DefaultPresentationPanelApi } from '@kbn/presentation-panel-plugin/public/panel_component/types';
import { HasEditCapabilities, useApiPublisher } from '@kbn/presentation-publishing';
import { MAP_SAVED_OBJECT_TYPE } from '../../common/constants';
import { SavedMap } from './map_page';
import { waitUntilTimeLayersLoad$ } from './map_page/map_app/wait_until_time_layers_load';
import { getSpacesApi } from '../kibana_services';
import { MapContainer } from '../connected_components/map_container';
import { getMapSettings } from '../selectors/map_selectors';
import {
  setMapSettings,
  setReadOnly,
  setGotoWithCenter,
} from '../actions';
import { setOnMapMove } from '../reducers/non_serializable_instances';
import { mapEmbeddablesSingleton } from '../embeddable/map_embeddables_singleton';

type MapApi = DefaultPresentationPanelApi &
  HasEditCapabilities & { someSpecialMapFunction: () => void };

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface MapInput {}

const mapEmbeddableFactory: EmbeddableComponentFactory<MapInput, MapApi> = {
  deserializeState: (state: unknown) => {
    /**
     * this is where you'd do any validation or type casting. This is also a good place to run
     * any migrations needed to ensure this state is of the latest version.
     */
    return state as MapInput;
  },
  getComponent: async (initialState: MapInput) => {
    const savedMap = new SavedMap({
      mapEmbeddableInput: initialState
    });
    await savedMap.whenReady();

    const viewMode$ = new BehaviorSubject<ViewMode>('edit');
    let isMovementSynchronized = initialState.isMovementSynchronized ?? true;
    let filterByMapExtent = initialState.filterByMapExtent ?? false;

    function propogateMapMovement(lat: number, lon: number, zoom: number) {
      if (isMovementSynchronized) {
        mapEmbeddablesSingleton.setLocation(initialState.id, lat, lon, zoom);
      }
    };
    // Passing callback into redux store instead of regular pattern of getting redux state changes for performance reasons
    savedMap.getStore().dispatch(setOnMapMove(propogateMapMovement));

    savedMap.getStore().dispatch(setReadOnly(true));
    savedMap.getStore().dispatch(
      setMapSettings({
        keydownScrollZoom: true,
        showTimesliderToggleButton: false,
      })
    );

    /**
     * Here we create the actual Component inline. This would be the equavalent of the
     *`Embeddable` class in the legacy system.
     */
    return CreateEmbeddableComponent((apiRef) => {
      useEffect(
        () => {
          mapEmbeddablesSingleton.register(initialState.id, {
            getTitle: () => {
              return initialState.id;
            },
            onLocationChange: (lat: number, lon: number, zoom: number) => {
              // auto fit to bounds is not compatable with map synchronization
              // auto fit to bounds may cause map location to never stablize and bound back and forth between bounds on different maps
              if (getMapSettings(savedMap.getStore().getState()).autoFitToDataBounds) {
                savedMap.getStore().dispatch(setMapSettings({ autoFitToDataBounds: false }));
              }
              savedMap.getStore().dispatch(setGotoWithCenter({ lat, lon, zoom }));
            },
            getIsMovementSynchronized: () => {
              return isMovementSynchronized;
            },
            setIsMovementSynchronized: (nextIsMovementSynchronized: boolean) => {
              isMovementSynchronized = nextIsMovementSynchronized;
              if (nextIsMovementSynchronized) {
                //this._gotoSynchronizedLocation();
              } else if (!nextIsMovementSynchronized && savedMap.getAutoFitToBounds()) {
                // restore autoFitToBounds when isMovementSynchronized disabled
                savedMap.getStore().dispatch(setMapSettings({ autoFitToDataBounds: true }));
              }
            },
            getIsFilterByMapExtent: () => {
              return filterByMapExtent;
            },
            setIsFilterByMapExtent: (nextFilterByMapExtent: boolean) => {
              filterByMapExtent = nextFilterByMapExtent;
              if (nextFilterByMapExtent) {
                //this._setMapExtentFilter();
              } else {
                //this._clearMapExtentFilter();
              }
            },
            getGeoFieldNames: () => {
              return getGeoFieldNames(savedMap.getStore().getState());
            },
          });

          return () => {
            mapEmbeddablesSingleton.unregister(initialState.id);
          };
        },
        []
      );

      /**
       * Implement all functions that need to be used externally here. Eventually this will include serialization and
       * diff-checking code for the Dashboard to use.
       */
      useApiPublisher(
        {
          /**
           * Imagine that we want the map to be edited inline. We can implement the HasEditCapabilities interface here.
           */
          getTypeDisplayName: () => 'Map',
          isEditingEnabled: () => true,
          onEdit: () => {
            console.log('edit me please');
            /**
             * Here we could open a flyout or modal to edit the embeddable.
             */
          },
          type: MAP_SAVED_OBJECT_TYPE,
          viewMode: viewMode$,
          someSpecialMapFunction: () => {
            console.log('look at me, I am a special map function');
          },
        },
        apiRef
      );

      const sharingSavedObjectProps = savedMap.getSharingSavedObjectProps();
      const spaces = getSpacesApi();
      return sharingSavedObjectProps && spaces && sharingSavedObjectProps?.outcome === 'conflict' ? (
          <div className="mapEmbeddedError">
            <EuiEmptyPrompt
              iconType="warning"
              iconColor="danger"
              data-test-subj="embeddable-maps-failure"
              body={spaces.ui.components.getEmbeddableLegacyUrlConflict({
                targetType: MAP_SAVED_OBJECT_TYPE,
                sourceId: sharingSavedObjectProps.sourceId!,
              })}
            />
          </div>
        ) : (
          <Provider store={savedMap.getStore()}>
            <MapContainer
              onSingleValueTrigger={(actionId: string, key: string, value: RawValue) => {
                console.log(`onSingleValueTrigger, actionId: ${actionId}, key: ${key}, value: ${value}`);
              }}
              addFilters={(filters: Filter[], actionId: string = ACTION_GLOBAL_APPLY_FILTER) => {
                console.log(`addFilters, filters: ${filters}, actionId: ${actionId}`);
              }}
              getFilterActions={() => {
                console.log(`getFilterActions`);
              }}
              getActionContext={() => {
                console.log(`getActionContext`);
              }}
              title="title"
              description="description"
              waitUntilTimeLayersLoad$={waitUntilTimeLayersLoad$(savedMap.getStore())}
              isSharable={true}
            />
          </Provider>
        );
    });
  },
};

export const MapTestPage = () => {
  /**
   * imagine we've loaded some raw unknown state from the panel in this Dashboard's input
   */
  const veryUnknownState: unknown = {
    savedObjectId: 'de71f4f0-1902-11e9-919b-ffe5949a18d2'
  };

  const mapInput = mapEmbeddableFactory.deserializeState(veryUnknownState);

  return (
    <>
      <EuiTitle>
        <h1>Map Test Page</h1>
      </EuiTitle>
      
      <PresentationPanel<MapApi> Component={mapEmbeddableFactory.getComponent({ ...mapInput, id: '1' })} />
      <PresentationPanel<MapApi> Component={mapEmbeddableFactory.getComponent({ ...mapInput, id: '2' })} />
    </>
  );
};
