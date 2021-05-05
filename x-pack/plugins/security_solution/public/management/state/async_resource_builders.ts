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

export const createUninitialisedResourceState = (): UninitialisedResourceState => {
  return { type: 'UninitialisedResourceState' };
};

export const createLoadingResourceState = <Data, Error>(
  previousState: StaleResourceState<Data, Error>
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

export const createFailedResourceState = <Data, Error>(
  error: Error,
  lastLoadedState?: LoadedResourceState<Data>
): FailedResourceState<Data, Error> => {
  return {
    type: 'FailedResourceState',
    error,
    lastLoadedState,
  };
};
