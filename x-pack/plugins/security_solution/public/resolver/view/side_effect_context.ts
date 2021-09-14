/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
  writeTextToClipboard(text: string): Promise<void> {
    return navigator.clipboard.writeText(text);
  },
  getBoundingClientRect(element: Element): DOMRect {
    return element.getBoundingClientRect();
  },
};

/**
 * The default values are used in production, tests can provide mock values using `SideEffectSimulator`.
 */
export const SideEffectContext: Context<SideEffectors> = createContext(sideEffectors);
