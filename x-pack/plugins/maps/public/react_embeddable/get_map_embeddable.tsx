/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { Provider } from 'react-redux';
import { EuiEmptyPrompt } from '@elastic/eui';
import { RegisterReactEmbeddable } from '@kbn/embeddable-plugin/public';
import { MAP_SAVED_OBJECT_TYPE } from '../../common/constants';
import type { MapEmbeddableInput } from '../embeddable/types';
import { SavedMap } from '../routes/map_page';
import { waitUntilTimeLayersLoad$ } from '../routes/map_page/map_app/wait_until_time_layers_load';
import { getSpacesApi } from '../kibana_services';
import { MapContainer } from '../connected_components/map_container';

export async function getMapEmbeddable(state: MapEmbeddableInput, maybeId?: string) {
  const savedMap = new SavedMap({
    mapEmbeddableInput: state
  });
  await savedMap.whenReady();

  return RegisterReactEmbeddable((apiRef) => {
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
}