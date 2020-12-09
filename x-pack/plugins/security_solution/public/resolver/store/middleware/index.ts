/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Dispatch, MiddlewareAPI } from 'redux';
import { ResolverState, DataAccessLayer } from '../../types';
import { ResolverTreeFetcher } from './resolver_tree_fetcher';

import { ResolverAction } from '../actions';
import { RelatedEventsFetcher } from './related_events_fetcher';
import { CurrentRelatedEventFetcher } from './current_related_event_fetcher';
import { NodeDataFetcher } from './node_data_fetcher';

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
    const relatedEventsFetcher = RelatedEventsFetcher(dataAccessLayer, api);
    const currentRelatedEventFetcher = CurrentRelatedEventFetcher(dataAccessLayer, api);
    const nodeDataFetcher = NodeDataFetcher(dataAccessLayer, api);
    return async (action: ResolverAction) => {
      next(action);

      resolverTreeFetcher();
      relatedEventsFetcher();
      nodeDataFetcher();
      currentRelatedEventFetcher();
    };
  };
};
