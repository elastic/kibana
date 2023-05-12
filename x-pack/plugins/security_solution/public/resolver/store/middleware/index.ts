/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Dispatch, MiddlewareAPI, AnyAction } from 'redux';
import { isEmpty } from 'lodash';
import type { DataAccessLayer, AnalyzerById } from '../../types';
import { ResolverTreeFetcher } from './resolver_tree_fetcher';
import type { State } from '../../../common/store/types';
import { RelatedEventsFetcher } from './related_events_fetcher';
import { CurrentRelatedEventFetcher } from './current_related_event_fetcher';
import { NodeDataFetcher } from './node_data_fetcher';
import * as Actions from '../actions';
import * as DataActions from '../data/action';
import * as CameraActions from '../camera/action';

type MiddlewareFactory<S = State> = (
  dataAccessLayer: DataAccessLayer
) => (
  api: MiddlewareAPI<Dispatch<AnyAction>, S>
) => (next: Dispatch<AnyAction>) => (action: AnyAction) => unknown;

const resolverActions = { ...Actions, ...DataActions, ...CameraActions };

/**
 * Helper function to determine if analyzer is active (resolver middleware should be run)
 * analyzer is considered active if:
 * 1. action is initial set up (create resolver), or
 * 2. action is not clean up, or
 * 3. analyzer state for action id is not empty
 * @param state analyzerbyId state
 * @param action dispatched action
 * @returns boolean of whether the analyzer of id has an store in redux
 */
function isAnalyzerActive(state: AnalyzerById, action: AnyAction): boolean {
  // middleware shouldn't run after clear resolver
  if (Actions.clearResolver.match(action)) {
    return false;
  }
  return Actions.createResolver.match(action) || !isEmpty(state[action.payload?.id]);
}

/**
 * Helper function to check whether an action is a resolver action
 * @param action dispatched action
 * @returns boolean of whether the action is a resolver action
 */
function isResolverAction(action: AnyAction): boolean {
  return Object.values(resolverActions).some((x) => x.match(action));
}
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

    return async (action: AnyAction) => {
      next(action);

      const state = api.getState().analyzer.analyzerById;
      if (action.payload?.id && isAnalyzerActive(state, action) && isResolverAction(action)) {
        resolverTreeFetcher(action.payload.id);
        relatedEventsFetcher(action.payload.id);
        nodeDataFetcher(action.payload.id);
        currentRelatedEventFetcher(action.payload.id);
      }
    };
  };
};
