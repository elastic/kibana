/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { EuiEmptyPrompt } from '@elastic/eui';
import { APPLY_FILTER_TRIGGER } from '@kbn/data-plugin/public';
import { ReactEmbeddableFactory, VALUE_CLICK_TRIGGER } from '@kbn/embeddable-plugin/public';
import { EmbeddableStateWithType } from '@kbn/embeddable-plugin/common';
import {
  apiIsOfType,
  areTriggersDisabled,
  getUnchangingComparator,
  initializeTimeRange,
  initializeTitles,
  useBatchedPublishingSubjects,
} from '@kbn/presentation-publishing';
import { BehaviorSubject } from 'rxjs';
import { apiPublishesSettings } from '@kbn/presentation-containers/interfaces/publishes_settings';
import { MAP_SAVED_OBJECT_TYPE } from '../../common/constants';
import { inject } from '../../common/embeddable';
import type { MapApi, MapRuntimeState, MapSerializedState } from './types';
import { SavedMap } from '../routes/map_page';
import { initializeReduxSync } from './initialize_redux_sync';
import {
  getByReferenceState,
  getByValueState,
  initializeLibraryTransforms,
} from './library_transforms';
import { getEmbeddableEnhanced, getSpacesApi } from '../kibana_services';
import { initializeActionHandlers } from './initialize_action_handlers';
import { MapContainer } from '../connected_components/map_container';
import { waitUntilTimeLayersLoad$ } from '../routes/map_page/map_app/wait_until_time_layers_load';
import { initializeCrossPanelActions } from './initialize_cross_panel_actions';
import { initializeDataViews } from './initialize_data_views';
import { initializeFetch } from './initialize_fetch';
import { initializeEditApi } from './initialize_edit_api';
import { extractReferences } from '../../common/migrations/references';
import { MapAttributes } from '../../common/content_management';
import { MapSettings } from '../../common/descriptor_types';
import { apiHidesFilterActions, isMapRendererApi } from './map_renderer/types';

export function getControlledBy(id: string) {
  return `mapEmbeddablePanel${id}`;
}

export const mapEmbeddableFactory: ReactEmbeddableFactory<
  MapSerializedState,
  MapRuntimeState,
  MapApi
> = {
  type: MAP_SAVED_OBJECT_TYPE,
  deserializeState: (state) => {
    return state.rawState
      ? (inject(
          state.rawState as EmbeddableStateWithType,
          state.references ?? []
        ) as unknown as MapSerializedState)
      : {};
  },
  buildEmbeddable: async (state, buildApi, uuid, parentApi) => {
    const savedMap = new SavedMap({
      mapSerializedState: state,
    });
    await savedMap.whenReady();

    const attributes$ = new BehaviorSubject<MapAttributes | undefined>(state.attributes);
    const mapSettings$ = new BehaviorSubject<Partial<MapSettings> | undefined>(state.mapSettings);
    const savedObjectId$ = new BehaviorSubject<string | undefined>(state.savedObjectId);

    // eslint bug, eslint thinks api is never reassigned even though it is
    // eslint-disable-next-line prefer-const
    let api: MapApi | undefined;
    const getApi = () => api;
    const sharingSavedObjectProps = savedMap.getSharingSavedObjectProps();
    const spaces = getSpacesApi();
    const controlledBy = getControlledBy(uuid);
    const title = initializeTitles(state);
    const timeRange = initializeTimeRange(state);
    const dynamicActionsApi = getEmbeddableEnhanced()?.initializeReactEmbeddableDynamicActions(
      uuid,
      () => title.titlesApi.panelTitle.getValue(),
      state
    );
    const maybeStopDynamicActions = dynamicActionsApi?.startDynamicActions();

    const defaultPanelTitle$ = new BehaviorSubject<string | undefined>(
      savedMap.getAttributes().title
    );
    const defaultPanelDescription$ = new BehaviorSubject<string | undefined>(
      savedMap.getAttributes().description
    );
    const reduxSync = initializeReduxSync({
      savedMap,
      state,
      syncColors$: apiPublishesSettings(parentApi) ? parentApi.settings.syncColors$ : undefined,
      uuid,
    });
    const actionHandlers = initializeActionHandlers(getApi);
    const crossPanelActions = initializeCrossPanelActions({
      controlledBy,
      getActionContext: actionHandlers.getActionContext,
      getApi,
      state,
      savedMap,
      uuid,
    });

    function getState() {
      return {
        ...state,
        ...timeRange.serialize(),
        ...title.serializeTitles(),
        ...(dynamicActionsApi?.serializeDynamicActions() ?? {}),
        ...crossPanelActions.serialize(),
        ...reduxSync.serialize(),
      };
    }

    function serializeState() {
      const rawState = getState();

      // by-reference embeddable
      if (rawState.savedObjectId) {
        // No references to extract for by-reference embeddable since all references are stored with by-reference saved object
        return {
          rawState: getByReferenceState(rawState, rawState.savedObjectId),
          references: [],
        };
      }

      /**
       * Canvas by-value embeddables do not support references
       */
      if (apiIsOfType(parentApi, 'canvas')) {
        return {
          rawState: getByValueState(rawState, savedMap.getAttributes()),
          references: [],
        };
      }

      // by-value embeddable
      const { attributes, references } = extractReferences({
        attributes: savedMap.getAttributes(),
      });

      return {
        rawState: getByValueState(rawState, attributes),
        references,
      };
    }

    api = buildApi(
      {
        defaultPanelTitle: defaultPanelTitle$,
        defaultPanelDescription: defaultPanelDescription$,
        ...timeRange.api,
        ...(dynamicActionsApi?.dynamicActionsApi ?? {}),
        ...title.titlesApi,
        ...reduxSync.api,
        ...initializeEditApi(uuid, getState, parentApi, state.savedObjectId),
        ...initializeLibraryTransforms(savedMap, serializeState),
        ...initializeDataViews(savedMap.getStore()),
        serializeState,
        supportedTriggers: () => {
          return [APPLY_FILTER_TRIGGER, VALUE_CLICK_TRIGGER];
        },
      },
      {
        ...timeRange.comparators,
        ...title.titleComparators,
        ...(dynamicActionsApi?.dynamicActionsComparator ?? {
          enhancements: getUnchangingComparator(),
        }),
        ...crossPanelActions.comparators,
        ...reduxSync.comparators,
        attributes: [attributes$, (next: MapAttributes | undefined) => attributes$.next(next)],
        mapSettings: [
          mapSettings$,
          (next: Partial<MapSettings> | undefined) => mapSettings$.next(next),
        ],
        savedObjectId: [savedObjectId$, (next: string | undefined) => savedObjectId$.next(next)],
        // readonly comparators
        mapBuffer: getUnchangingComparator(),
      }
    );

    const unsubscribeFromFetch = initializeFetch({
      api,
      controlledBy,
      getIsFilterByMapExtent: crossPanelActions.getIsFilterByMapExtent,
      searchSessionMapBuffer: state.mapBuffer,
      store: savedMap.getStore(),
    });

    return {
      api,
      Component: () => {
        const [defaultPanelTitle, panelTitle, defaultPanelDescription, panelDescription] =
          useBatchedPublishingSubjects(
            defaultPanelTitle$,
            title.titlesApi.panelTitle,
            defaultPanelDescription$,
            title.titlesApi.panelDescription
          );

        useEffect(() => {
          return () => {
            crossPanelActions.cleanup();
            reduxSync.cleanup();
            unsubscribeFromFetch();
            maybeStopDynamicActions?.stopDynamicActions();
          };
        }, []);

        return sharingSavedObjectProps &&
          spaces &&
          sharingSavedObjectProps?.outcome === 'conflict' ? (
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
              onSingleValueTrigger={actionHandlers.onSingleValueTrigger}
              addFilters={
                (apiHidesFilterActions(parentApi) && parentApi.hideFilterActions) ||
                areTriggersDisabled(api)
                  ? null
                  : actionHandlers.addFilters
              }
              getFilterActions={actionHandlers.getFilterActions}
              getActionContext={actionHandlers.getActionContext}
              renderTooltipContent={
                isMapRendererApi(parentApi) && parentApi.getTooltipRenderer
                  ? parentApi.getTooltipRenderer()
                  : undefined
              }
              title={panelTitle ?? defaultPanelTitle}
              description={panelDescription ?? defaultPanelDescription}
              waitUntilTimeLayersLoad$={waitUntilTimeLayersLoad$(savedMap.getStore())}
              isSharable={apiIsOfType(parentApi, 'dashboard') || apiIsOfType(parentApi, 'canvas')}
            />
          </Provider>
        );
      },
    };
  },
};
