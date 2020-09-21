/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Dispatch, MiddlewareAPI } from 'redux';
import { ResolverState, DataAccessLayer } from '../../types';
import { ResolverRelatedEvents } from '../../../../common/endpoint/types';
import { ResolverTreeFetcher } from './resolver_tree_fetcher';
import { ResolverAction } from '../actions';

type MiddlewareFactory<S = ResolverState> = (
  dataAccessLayer: DataAccessLayer
) => (
  api: MiddlewareAPI<Dispatch<ResolverAction>, S>
) => (next: Dispatch<ResolverAction>) => (action: ResolverAction) => unknown;

/**
 * The `redux` middleware that the application uses to trigger side effects.
 * All data fetching should be done here.
 * For actions that the application triggers directly, use `app` as a prefix for the type.
 * For actions that are triggered as a result of server interaction, use `server` as a prefix for the type.
 */
export const resolverMiddlewareFactory: MiddlewareFactory = (dataAccessLayer: DataAccessLayer) => {
  return (api) => (next) => {
    const resolverTreeFetcher = ResolverTreeFetcher(dataAccessLayer, api);
    return async (action: ResolverAction) => {
      next(action);

      resolverTreeFetcher();

      // TODO if panelviewandparameters changed, and it is on something??

      if (
        action.type === 'userRequestedRelatedEventData' ||
        action.type === 'appDetectedMissingEventData'
      ) {
        const entityIdToFetchFor = action.payload;
        let result: ResolverRelatedEvents | undefined;
        try {
          result = await dataAccessLayer.relatedEvents(entityIdToFetchFor);
        } catch {
          api.dispatch({
            type: 'serverFailedToReturnRelatedEventData',
            payload: action.payload,
          });
        }

        if (result) {
          api.dispatch({
            type: 'serverReturnedRelatedEventData',
            payload: result,
          });
        }
      }
    };
  };
};
