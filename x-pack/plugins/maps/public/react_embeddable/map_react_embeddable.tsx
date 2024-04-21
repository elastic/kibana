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
import { initializeTimeRange, initializeTitles } from '@kbn/presentation-publishing';
import { BehaviorSubject } from 'rxjs';
import { apiPublishesSettings } from '@kbn/presentation-containers/interfaces/publishes_settings';
import { MAP_SAVED_OBJECT_TYPE } from '../../common/constants';
import { inject } from '../../common/embeddable';
import { extract, type MapEmbeddablePersistableState } from '../../common/embeddable';
import type { MapApi, MapSerializeState } from './types';
import { SavedMap } from '../routes/map_page';
import type { MapEmbeddableInput } from '../embeddable/types';
import { initializeReduxSync } from './initialize_redux_sync';
import { initializeLibraryTransforms } from './initialize_library_transforms';
import { getEmbeddableEnhanced, getSpacesApi } from '../kibana_services';
import { initializeActionHandlers } from './initialize_action_handlers';
import { MapContainer } from '../connected_components/map_container';
import { waitUntilTimeLayersLoad$ } from '../routes/map_page/map_app/wait_until_time_layers_load';
import { initializeCrossPanelActions } from './initialize_cross_panel_actions';
import { initializeDataViews } from './initialize_data_views';
import { initializeFetch } from './initialize_fetch';
import { RenderToolTipContent } from '../classes/tooltips/tooltip_property';

export function getControlledBy(id: string) {
  return `mapEmbeddablePanel${id}`;
}

export const mapEmbeddableFactory: ReactEmbeddableFactory<MapSerializeState, MapApi> = {
  type: MAP_SAVED_OBJECT_TYPE,
  deserializeState: (state) => {
    return state.rawState
      ? (inject(
          state.rawState as EmbeddableStateWithType,
          state.references ?? []
        ) as unknown as MapSerializeState)
      : {};
  },
  buildEmbeddable: async (state, buildApi, uuid, parentApi) => {
    const savedMap = new SavedMap({
      mapEmbeddableInput: state as unknown as MapEmbeddableInput,
    });
    await savedMap.whenReady();

    let api: MapApi | undefined;
    const getApi = () => api;
    let renderTooltipContent: RenderToolTipContent | undefined;
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

    const defaultPanelTitle = new BehaviorSubject<string | undefined>(
      savedMap.getAttributes().title
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

    function serializeState() {
      const { state: rawState, references } = extract({
        ...state,
        ...timeRange.serialize(),
        ...title.serializeTitles(),
        ...(dynamicActionsApi?.serializeDynamicActions() ?? {}),
        ...crossPanelActions.serialize(),
        ...reduxSync.serialize(),
      } as unknown as MapEmbeddablePersistableState);
      return {
        rawState: rawState as unknown as MapSerializeState,
        references,
      };
    }

    api = buildApi(
      {
        defaultPanelTitle,
        ...timeRange.api,
        ...(dynamicActionsApi?.dynamicActionsApi ?? {}),
        ...title.titlesApi,
        ...reduxSync.api,
        ...initializeLibraryTransforms(savedMap, serializeState),
        ...initializeDataViews(savedMap.getStore()),
        serializeState,
        setRenderTooltipContent: (nextValue: RenderToolTipContent) => {
          renderTooltipContent = nextValue;
        },
        supportedTriggers: () => {
          return [APPLY_FILTER_TRIGGER, VALUE_CLICK_TRIGGER];
        },
      },
      {
        ...timeRange.comparators,
        ...title.titleComparators,
        ...(dynamicActionsApi?.dynamicActionsComparator ?? {}),
        ...crossPanelActions.comparators,
        ...reduxSync.comparators,
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
              addFilters={state.hideFilterActions ? null : actionHandlers.addFilters}
              getFilterActions={actionHandlers.getFilterActions}
              getActionContext={actionHandlers.getActionContext}
              renderTooltipContent={renderTooltipContent}
              title="title"
              description="description"
              waitUntilTimeLayersLoad$={waitUntilTimeLayersLoad$(savedMap.getStore())}
              isSharable={state.isSharable ?? true}
            />
          </Provider>
        );
      },
    };
  },
};
