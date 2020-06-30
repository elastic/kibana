/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Dispatch, MiddlewareAPI } from 'redux';
import { KibanaReactContextValue } from '../../../../../../../src/plugins/kibana_react/public';
import { StartServices } from '../../../types';
import { ResolverState } from '../../types';
import { ResolverRelatedEvents } from '../../../../common/endpoint/types';
import { ResolverTreeFetcher } from './resolver_tree_fetcher';
import { ResolverAction } from '../actions';

type MiddlewareFactory<S = ResolverState> = (
  context?: KibanaReactContextValue<StartServices>
) => (
  api: MiddlewareAPI<Dispatch<ResolverAction>, S>
) => (next: Dispatch<ResolverAction>) => (action: ResolverAction) => unknown;

/**
 * The redux middleware that the app uses to trigger side effects.
 * All data fetching should be done here.
 * For actions that the app triggers directly, use `app` as a prefix for the type.
 * For actions that are triggered as a result of server interaction, use `server` as a prefix for the type.
 */
export const resolverMiddlewareFactory: MiddlewareFactory = (context) => {
  return (api) => (next) => {
    // This cannot work w/o `context`.
    if (!context) {
      return async (action: ResolverAction) => {
        next(action);
      };
    }
    const resolverTreeFetcher = ResolverTreeFetcher(context, api);
    return async (action: ResolverAction) => {
      next(action);

      resolverTreeFetcher();

      if (
        action.type === 'userRequestedRelatedEventData' ||
        action.type === 'appDetectedMissingEventData'
      ) {
        const entityIdToFetchFor = action.payload;
        let result: ResolverRelatedEvents | undefined;
        try {
          result = await context.services.http.get(
            `/api/endpoint/resolver/${entityIdToFetchFor}/events`,
            {
              query: { events: 100 },
            }
          );
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
