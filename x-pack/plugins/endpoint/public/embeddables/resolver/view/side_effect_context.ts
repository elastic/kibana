/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { createContext, Context } from 'react';
import { SideEffects } from '../types';

const s: SideEffects = {
  timestamp: () => Date.now(),
  requestAnimationFrame: window.requestAnimationFrame,
};
export const SideEffectContext: Context<SideEffects> = createContext(s);
