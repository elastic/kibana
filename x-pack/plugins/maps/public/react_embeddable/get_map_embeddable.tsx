/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { Provider } from 'react-redux';
import { BehaviorSubject } from 'rxjs';
import { EuiEmptyPrompt } from '@elastic/eui';
import type { TimeRange } from '@kbn/es-query';
import {
  type ReactEmbeddableFactory,
  initializeReactEmbeddableTitles,
  initializeReactEmbeddableUuid,
  RegisterReactEmbeddable,
  useReactEmbeddableApiHandle,
  useReactEmbeddableUnsavedChanges
} from '@kbn/embeddable-plugin/public';
import { MAP_SAVED_OBJECT_TYPE } from '../../common/constants';
import type { MapApi } from './types';
import { useActionHandlers } from './use_action_handlers';
import type { MapEmbeddableInput } from '../embeddable/types';
import { SavedMap } from '../routes/map_page';
import { waitUntilTimeLayersLoad$ } from '../routes/map_page/map_app/wait_until_time_layers_load';
import { getSpacesApi } from '../kibana_services';
import { MapContainer } from '../connected_components/map_container';

export async function getMapEmbeddable(
  factory: ReactEmbeddableFactory<MapEmbeddableInput, MapApi>,
  state: MapEmbeddableInput, 
  maybeId?: string
) {
  const savedMap = new SavedMap({
    mapEmbeddableInput: state
  });
  await savedMap.whenReady();

  const uuid = initializeReactEmbeddableUuid(maybeId);
  const { titlesApi, titleComparators, serializeTitles } =
    initializeReactEmbeddableTitles(state);
  const timeRange = new BehaviorSubject<TimeRange | undefined>(state.timeRange);

  return RegisterReactEmbeddable((apiRef) => {
    
    const { unsavedChanges, resetUnsavedChanges } = useReactEmbeddableUnsavedChanges(
      uuid,
      factory,
      {
        ...titleComparators,
      }
    );

    const thisApi = useReactEmbeddableApiHandle(
      {
        ...titlesApi,
        localTimeRange: timeRange,
        setLocalTimeRange: (timeRange: TimeRange | undefined) => {
          timeRange.next(timeRange);
        },
        unsavedChanges,
        resetUnsavedChanges,
        serializeState: async () => {
          return {
            rawState: {
              ...serializeTitles(),
            },
          };
        },
      },
      apiRef,
      uuid
    ) as MapApi;

    const { addFilters, getActionContext, getFilterActions, onSingleValueTrigger } = useActionHandlers(thisApi);

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
  });
}