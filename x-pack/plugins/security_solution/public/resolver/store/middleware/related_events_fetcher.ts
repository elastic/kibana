/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Dispatch, MiddlewareAPI } from 'redux';
import { isEqual } from 'lodash';
import { ResolverRelatedEvents } from '../../../../common/endpoint/types';

import { ResolverState, DataAccessLayer, PanelViewAndParameters } from '../../types';
import * as selectors from '../selectors';
import { ResolverAction } from '../actions';

export function RelatedEventsFetcher(
  dataAccessLayer: DataAccessLayer,
  api: MiddlewareAPI<Dispatch<ResolverAction>, ResolverState>
): () => void {
  let last: PanelViewAndParameters | undefined;

  // Call this after each state change.
  // This fetches the ResolverTree for the current entityID
  // if the entityID changes while
  return async () => {
    const state = api.getState();

    const newParams = selectors.panelViewAndParameters(state);
    const oldParams = last;
    // Update this each time before fetching data (or even if we don't fetch data) so that subsequent actions that call this (concurrently) will have up to date info.
    last = newParams;

    if (
      // TODO, yea right
      !isEqual(newParams, oldParams) &&
      (newParams.panelView === 'nodeEventsOfType' || newParams.panelView === 'eventDetail')
    ) {
      const nodeID = newParams.panelParameters.nodeID;

      const result: ResolverRelatedEvents | undefined = await dataAccessLayer.relatedEvents(nodeID);

      if (result) {
        api.dispatch({
          type: 'serverReturnedRelatedEventData',
          payload: result,
        });
      }
    }
  };
}
