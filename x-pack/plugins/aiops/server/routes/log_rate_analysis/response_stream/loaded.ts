/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamState } from './types';

export const loadedFactory = (state: StreamState) => {
  function loaded(): number;
  function loaded(d: number, replace?: boolean): undefined;
  function loaded(d?: number, replace = true) {
    if (typeof d === 'number') {
      if (replace) {
        state.loaded = d;
      } else {
        state.loaded += d;
      }
    } else {
      return state.loaded;
    }
  }

  return loaded;
};

export type StreamLoaded = ReturnType<typeof loadedFactory>;
