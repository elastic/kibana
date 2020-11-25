/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Dispatch, MiddlewareAPI } from 'redux';
import { ResolverState, DataAccessLayer, ResolverMiddlewareFactoryDependencies } from '../../types';
import { ResolverTreeFetcher } from './resolver_tree_fetcher';

import { ResolverAction } from '../actions';
import { RelatedEventsFetcher } from './related_events_fetcher';
import { CurrentRelatedEventFetcher } from './current_related_event_fetcher';

type MiddlewareFactory<S = ResolverState> = (
  dependencies: ResolverMiddlewareFactoryDependencies
) => (
  api: MiddlewareAPI<Dispatch<ResolverAction>, S>
) => (next: Dispatch<ResolverAction>) => (action: ResolverAction) => unknown;

/**
 * The `redux` middleware that the application uses to trigger side effects.
 * All data fetching should be done here.
 * For actions that the application triggers directly, use `app` as a prefix for the type.
 * For actions that are triggered as a result of server interaction, use `server` as a prefix for the type.
 */
export const resolverMiddlewareFactory: MiddlewareFactory = (
  dependencies: ResolverMiddlewareFactoryDependencies
) => {
  return (api) => (next) => {
    const resolverTreeFetcher = ResolverTreeFetcher(dependencies, { ...api, dispatch: next });
    const relatedEventsFetcher = RelatedEventsFetcher(dependencies, { ...api, dispatch: next });
    const currentRelatedEventFetcher = CurrentRelatedEventFetcher(dependencies, {
      ...api,
      dispatch: next,
    });
    return async (action: ResolverAction) => {
      next(action);

      resolverTreeFetcher();
      relatedEventsFetcher();
      currentRelatedEventFetcher();
    };
  };
};
