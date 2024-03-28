/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { EuiEmptyPrompt } from '@elastic/eui';
import { ReactEmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { EmbeddableStateWithType } from '@kbn/embeddable-plugin/common';
import { initializeTitles } from '@kbn/presentation-publishing';
import { BehaviorSubject } from 'rxjs';
import { MAP_SAVED_OBJECT_TYPE } from '../../common/constants';
import { inject } from '../../common/embeddable';
import { extract, type MapEmbeddablePersistableState } from '../../common/embeddable';
import type { MapApi, MapSerializeState } from './types';
import { SavedMap } from '../routes/map_page';
import type { MapEmbeddableInput } from '../embeddable/types';
import { initializeReduxSync } from './initialize_redux_sync';
import { initializeLibraryTransforms } from './initialize_library_transforms';
import { getSpacesApi } from '../kibana_services';
import { initializeActionHandlers } from './initialize_action_handlers';
import { MapContainer } from '../connected_components/map_container';
import { waitUntilTimeLayersLoad$ } from '../routes/map_page/map_app/wait_until_time_layers_load';

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
  buildEmbeddable: async (state, buildApi) => {
    const savedMap = new SavedMap({
      mapEmbeddableInput: state as unknown as MapEmbeddableInput,
    });
    await savedMap.whenReady();

    const { titlesApi, titleComparators, serializeTitles } = initializeTitles(state);

    const { cleanupReduxSync, reduxApi, reduxComparators, serializeRedux } =
      initializeReduxSync(savedMap.getStore(), state);

    function serializeState() {
      const { state: rawState, references } = extract({
        ...state,
        ...serializeTitles(),
        ...serializeRedux(),
      } as unknown as MapEmbeddablePersistableState);
      return {
        rawState: rawState as unknown as MapSerializeState,
        references,
      };
    }

    const api = buildApi(
      {
        defaultPanelTitle: new BehaviorSubject<string | undefined>(savedMap.getAttributes().title),
        ...titlesApi,
        ...reduxApi,
        ...initializeLibraryTransforms(savedMap, serializeState),
        serializeState,
      },
      {
        ...titleComparators,
        ...reduxComparators,
      }
    );

    const sharingSavedObjectProps = savedMap.getSharingSavedObjectProps();
    const spaces = getSpacesApi();
    const actionHandlers = initializeActionHandlers(api);

    return {
      api,
      Component: () => {
        useEffect(() => {
          return () => {
            cleanupReduxSync();
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
