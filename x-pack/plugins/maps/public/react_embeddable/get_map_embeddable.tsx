/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { BehaviorSubject } from 'rxjs';
import { EuiEmptyPrompt } from '@elastic/eui';
import {
  type ReactEmbeddableFactory,
  initializeReactEmbeddableTitles,
} from '@kbn/embeddable-plugin/public';
import { MAP_SAVED_OBJECT_TYPE } from '../../common/constants';
import { extract, type MapEmbeddablePersistableState } from '../../common/embeddable';
import type { MapApi, MapSerializeState } from './types';
import { useActionHandlers } from './use_action_handlers';
import type { MapEmbeddableInput } from '../embeddable/types';
import { SavedMap } from '../routes/map_page';
import { waitUntilTimeLayersLoad$ } from '../routes/map_page/map_app/wait_until_time_layers_load';
import { getSpacesApi } from '../kibana_services';
import { MapContainer } from '../connected_components/map_container';
import { initReduxStateSync } from './init_redux_state_sync';
import { getLibraryInterface } from './get_library_interface';

export const getMapEmbeddable: ReactEmbeddableFactory<MapSerializeState, MapApi>['buildEmbeddable'] = async (
  state, 
  buildApi,
) => {
  const savedMap = new SavedMap({
    mapEmbeddableInput: state as unknown as MapEmbeddableInput
  });
  await savedMap.whenReady();

  const { titlesApi, titleComparators, serializeTitles } =
    initializeReactEmbeddableTitles(state);
  
  const {
    cleanupReduxStateSync,
    reduxStateComparators,
    serializeReduxState,
  } = initReduxStateSync(savedMap.getStore(), state);

  const api = buildApi(
    {
      defaultPanelTitle: new BehaviorSubject<string | undefined>(savedMap.getAttributes().title),
      ...titlesApi,
      ...getLibraryInterface(savedMap),
      serializeState: () => {
        const { state: rawState, references } = extract({
          ...state,
          ...serializeTitles(),
          ...serializeReduxState(),
        } as unknown as MapEmbeddablePersistableState);
        return {
          rawState: rawState as unknown as MapEmbeddableInput,
          references
        };
      },
    },
    {
      ...titleComparators,
      ...reduxStateComparators,
    }
  );

  const sharingSavedObjectProps = savedMap.getSharingSavedObjectProps();
  const spaces = getSpacesApi();

  return {
    api,
    Component: () => {
      useEffect(() => {
        return () => {
          cleanupReduxStateSync();
        }
      }, []);

      const { addFilters, getActionContext, getFilterActions, onSingleValueTrigger } = useActionHandlers(api);
  
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
              onSingleValueTrigger={onSingleValueTrigger}
              addFilters={state.hideFilterActions ? null : addFilters}
              getFilterActions={getFilterActions}
              getActionContext={getActionContext}
              title="title"
              description="description"
              waitUntilTimeLayersLoad$={waitUntilTimeLayersLoad$(savedMap.getStore())}
              isSharable={true}
            />
          </Provider>
        );
    },
  };
}