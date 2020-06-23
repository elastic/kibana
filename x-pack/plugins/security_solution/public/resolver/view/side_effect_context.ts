/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { createContext, Context } from 'react';
import ResizeObserver from 'resize-observer-polyfill';
import { SideEffectors } from '../types';

/**
 * React context that provides 'side-effectors' which we need to mock during testing.
 */
const sideEffectors: SideEffectors = {
  timestamp: () => Date.now(),
  requestAnimationFrame(...args) {
    return window.requestAnimationFrame(...args);
  },
  cancelAnimationFrame(...args) {
    return window.cancelAnimationFrame(...args);
  },
  ResizeObserver,
};

/**
 * The default values are used in production, tests can provide mock values using `SideEffectSimulator`.
 */
export const SideEffectContext: Context<SideEffectors> = createContext(sideEffectors);
