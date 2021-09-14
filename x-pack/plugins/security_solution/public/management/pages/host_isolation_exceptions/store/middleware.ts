/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ImmutableMiddleware, ImmutableMiddlewareFactory } from '../../../../common/store';
import { AppAction } from '../../../../common/store/actions';
import { HostIsolationExceptionsPageState } from '../types';

export const createHostIsolationExceptionsPageMiddleware = (): ImmutableMiddleware<
  HostIsolationExceptionsPageState,
  AppAction
> => {
  return (store) => (next) => async (action) => {
    next(action);
  };
};

export const hostIsolationExceptionsMiddlewareFactory: ImmutableMiddlewareFactory<HostIsolationExceptionsPageState> = (
  coreStart
) => createHostIsolationExceptionsPageMiddleware();
