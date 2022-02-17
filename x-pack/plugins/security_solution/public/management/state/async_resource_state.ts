/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * this file contains set of types to represent state of asynchronous resource.
 * Resource is defined as a reference to potential data that is loaded/updated
 * using asynchronous communication with data source (for example through REST API call).
 * Asynchronous update implies that next to just having data:
 *  - there is moment in time when data is not loaded/initialised and not in process of loading/updating
 *  - process performing data update can take considerable time which needs to be communicated to user
 *  - update can fail due to multiple reasons and also needs to be communicated to the user
 */

import { Immutable } from '../../../common/endpoint/types';
import { ServerApiError } from '../../common/types';

/**
 * Data type to represent uninitialised state of asynchronous resource.
 * This state indicates that no actions to load the data has be taken.
 */
export interface UninitialisedResourceState {
  type: 'UninitialisedResourceState';
}

/**
 * Data type to represent loading state of asynchronous resource. Loading state
 * should be used to indicate that data is in the process of loading/updating.
 * It contains reference to previous stale state that can be used to present
 * previous state of resource to the user (like show previous already loaded
 * data or show previous failure).
 *
 * @param Data - type of the data that is referenced by resource state
 * @param Error - type of the error that can happen during attempt to update data
 */
export interface LoadingResourceState<Data = null, Error = ServerApiError> {
  type: 'LoadingResourceState';
  previousState?: StaleResourceState<Data, Error>;
}

/**
 * Data type to represent loaded state of asynchronous resource. Loaded state
 * is characterised with reference to the loaded data.
 *
 * @param Data - type of the data that is referenced by resource state
 */
export interface LoadedResourceState<Data = null> {
  type: 'LoadedResourceState';
  data: Data;
}

/**
 * Data type to represent failed state of asynchronous resource. Failed state
 * is characterised with error and can reference last loaded state. Reference
 * to last loaded state can be used to present previous successfully loaded data.
 *
 * @param Data - type of the data that is referenced by resource state
 * @param Error - type of the error that can happen during attempt to update data
 */
export interface FailedResourceState<Data = null, Error = ServerApiError> {
  type: 'FailedResourceState';
  error: Error;
  lastLoadedState?: LoadedResourceState<Data>;
}

/**
 * Data type to represent stale (not loading) state of asynchronous resource.
 *
 * @param Data - type of the data that is referenced by resource state
 * @param Error - type of the error that can happen during attempt to update data
 */
export type StaleResourceState<Data = null, Error = ServerApiError> =
  | UninitialisedResourceState
  | LoadedResourceState<Data>
  | FailedResourceState<Data, Error>;

/**
 * Data type to represent any state of asynchronous resource.
 *
 * @param Data - type of the data that is referenced by resource state
 * @param Error - type of the error that can happen during attempt to update data
 */
export type AsyncResourceState<Data = null, Error = ServerApiError> =
  | UninitialisedResourceState
  | LoadingResourceState<Data, Error>
  | LoadedResourceState<Data>
  | FailedResourceState<Data, Error>;

// Set of guards to narrow the type of AsyncResourceState that make further refactoring easier

export const isUninitialisedResourceState = <Data, Error>(
  state: Immutable<AsyncResourceState<Data, Error>>
): state is Immutable<UninitialisedResourceState> => state.type === 'UninitialisedResourceState';

export const isLoadingResourceState = <Data, Error>(
  state: Immutable<AsyncResourceState<Data, Error>>
): state is Immutable<LoadingResourceState<Data, Error>> => state.type === 'LoadingResourceState';

export const isLoadedResourceState = <Data, Error>(
  state: Immutable<AsyncResourceState<Data, Error>>
): state is Immutable<LoadedResourceState<Data>> => state.type === 'LoadedResourceState';

export const isFailedResourceState = <Data, Error>(
  state: Immutable<AsyncResourceState<Data, Error>>
): state is Immutable<FailedResourceState<Data, Error>> => state.type === 'FailedResourceState';

export const isStaleResourceState = <Data, Error>(
  state: Immutable<AsyncResourceState<Data, Error>>
): state is Immutable<StaleResourceState<Data, Error>> =>
  isUninitialisedResourceState(state) ||
  isLoadedResourceState(state) ||
  isFailedResourceState(state);

// Set of functions to work with AsyncResourceState

export const getLastLoadedResourceState = <Data, Error>(
  state: Immutable<AsyncResourceState<Data, Error>>
): Immutable<LoadedResourceState<Data>> | undefined => {
  if (isLoadedResourceState(state)) {
    return state;
  } else if (isLoadingResourceState(state) && state.previousState !== undefined) {
    return getLastLoadedResourceState(state.previousState);
  } else if (isFailedResourceState(state)) {
    return state.lastLoadedState;
  } else {
    return undefined;
  }
};

export const getCurrentResourceError = <Data, Error>(
  state: Immutable<AsyncResourceState<Data, Error>>
): Immutable<Error> | undefined => {
  return isFailedResourceState(state) ? state.error : undefined;
};

export const isOutdatedResourceState = <Data, Error>(
  state: Immutable<AsyncResourceState<Data, Error>>,
  isFresh: (data: Immutable<Data>) => boolean
): boolean =>
  isUninitialisedResourceState(state) ||
  (isLoadedResourceState(state) && !isFresh(state.data)) ||
  (isFailedResourceState(state) &&
    (!state.lastLoadedState || !isFresh(state.lastLoadedState.data)));
