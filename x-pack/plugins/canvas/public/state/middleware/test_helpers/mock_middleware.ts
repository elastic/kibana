/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { PayloadAction } from '@reduxjs/toolkit';
import { AnyAction, Middleware } from 'redux';

export const mockMiddleware = (middleware: Middleware) => {
  const store = {
    getState: jest.fn(() => ({})),
    dispatch: jest.fn(),
  };

  const next = jest.fn();

  const invoke = (action: PayloadAction<AnyAction>) => middleware(store)(next)(action);

  return { store, next, invoke };
};
