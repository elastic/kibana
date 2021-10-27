/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  FailedResourceState,
  LoadedResourceState,
  LoadingResourceState,
  StaleResourceState,
  UninitialisedResourceState,
} from './async_resource_state';
import { ServerApiError } from '../../common/types';

export const createUninitialisedResourceState = (): UninitialisedResourceState => {
  return { type: 'UninitialisedResourceState' };
};

export const createLoadingResourceState = <Data, Error = ServerApiError>(
  previousState?: StaleResourceState<Data, Error>
): LoadingResourceState<Data, Error> => {
  return {
    type: 'LoadingResourceState',
    previousState,
  };
};

export const createLoadedResourceState = <Data>(data: Data): LoadedResourceState<Data> => {
  return {
    type: 'LoadedResourceState',
    data,
  };
};

export const createFailedResourceState = <Data, Error = ServerApiError>(
  error: Error,
  lastLoadedState?: LoadedResourceState<Data>
): FailedResourceState<Data, Error> => {
  return {
    type: 'FailedResourceState',
    error,
    lastLoadedState,
  };
};

/**
 * Takes an existing AsyncResourceState and transforms it into a StaleResourceState (not loading)
 * Note: If a loading state is passed, the resource is returned as UninitialisedResourceState
 */
export const asStaleResourceState = <Data, Error = ServerApiError>(resource: {
  type:
    | 'LoadedResourceState'
    | 'FailedResourceState'
    | 'UninitialisedResourceState'
    | 'LoadingResourceState';
}): StaleResourceState<Data, Error> => {
  switch (resource.type) {
    case 'LoadedResourceState':
      return resource as LoadedResourceState<Data>;
    case 'FailedResourceState':
      return resource as FailedResourceState<Data, Error>;
    case 'UninitialisedResourceState':
    case 'LoadingResourceState':
      return createUninitialisedResourceState();
  }
};
