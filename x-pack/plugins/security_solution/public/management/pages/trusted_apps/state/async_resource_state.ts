/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Immutable } from '../../../../../common/endpoint/types';
import { ServerApiError } from '../../../../common/types';

export interface UninitialisedResourceState {
  type: 'UninitialisedResourceState';
}

export interface LoadingResourceState<Data, Error = ServerApiError> {
  type: 'LoadingResourceState';
  previousState: StaleResourceState<Data, Error>;
}

export interface LoadedResourceState<Data> {
  type: 'LoadedResourceState';
  data: Data;
}

export interface FailedResourceState<Data, Error = ServerApiError> {
  type: 'FailedResourceState';
  error: Error;
  lastLoadedState?: LoadedResourceState<Data>;
}

export type StaleResourceState<Data, Error = ServerApiError> =
  | UninitialisedResourceState
  | LoadedResourceState<Data>
  | FailedResourceState<Data, Error>;

export type AsyncResourceState<Data, Error = ServerApiError> =
  | UninitialisedResourceState
  | LoadingResourceState<Data, Error>
  | LoadedResourceState<Data>
  | FailedResourceState<Data, Error>;

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

export const getLastLoadedResourceState = <Data, Error>(
  state: Immutable<AsyncResourceState<Data, Error>>
): Immutable<LoadedResourceState<Data>> | undefined => {
  if (isLoadedResourceState(state)) {
    return state;
  } else if (isLoadingResourceState(state)) {
    return getLastLoadedResourceState(state.previousState);
  } else if (isFailedResourceState(state)) {
    return state.lastLoadedState;
  } else {
    return undefined;
  }
};

export const getLastLoadedResourceData = <Data, Error>(
  state: Immutable<AsyncResourceState<Data, Error>>
): Immutable<Data> | undefined => {
  return getLastLoadedResourceState(state)?.data;
};

export const getCurrentResourceError = <Data, Error>(
  state: Immutable<AsyncResourceState<Data, Error>>
): Immutable<Error> | undefined => {
  return isFailedResourceState(state) ? state.error : undefined;
};

export const isOutdatedResourceState = <Data, Error>(
  state: AsyncResourceState<Data, Error>,
  isFresh: (data: Data) => boolean
): boolean =>
  isUninitialisedResourceState(state) ||
  (isLoadedResourceState(state) && !isFresh(state.data)) ||
  (isFailedResourceState(state) &&
    (!state.lastLoadedState || !isFresh(state.lastLoadedState.data)));
