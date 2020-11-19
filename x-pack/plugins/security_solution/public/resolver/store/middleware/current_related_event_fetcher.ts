/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Dispatch, MiddlewareAPI } from 'redux';
import { isEqual } from 'lodash';
import { SafeResolverEvent } from '../../../../common/endpoint/types';

import { ResolverState, DataAccessLayer, PanelViewAndParameters } from '../../types';
import * as selectors from '../selectors';
import { ResolverAction } from '../actions';

/**
 *
 * @description - This api is called after every state change.
 * If the current view is the `eventDetail` view it will request the event details from the server.
 * @export
 * @param {DataAccessLayer} dataAccessLayer
 * @param {MiddlewareAPI<Dispatch<ResolverAction>, ResolverState>} api
 * @returns {() => void}
 */
export function CurrentRelatedEventFetcher(
  dataAccessLayer: DataAccessLayer,
  api: MiddlewareAPI<Dispatch<ResolverAction>, ResolverState>
): () => void {
  let last: PanelViewAndParameters | undefined;

  return async () => {
    const state = api.getState();

    const newParams = selectors.panelViewAndParameters(state);

    const oldParams = last;
    last = newParams;

    // If the panel view params have changed and the current panel view is the `eventDetail`, then fetch the event details for that eventID.
    if (!isEqual(newParams, oldParams) && newParams.panelView === 'eventDetail') {
      const currentEventID = newParams.panelParameters.eventID;

      api.dispatch({
        type: 'appRequestedCurrentRelatedEventData',
      });

      let result: SafeResolverEvent | null = null;
      try {
        result = await dataAccessLayer.event(currentEventID);
      } catch (error) {
        api.dispatch({
          type: 'serverFailedToReturnCurrentRelatedEventData',
        });
      }

      if (result) {
        api.dispatch({
          type: 'serverReturnedCurrentRelatedEventData',
          payload: result,
        });
      } else {
        api.dispatch({
          type: 'serverFailedToReturnCurrentRelatedEventData',
        });
      }
    }
  };
}
