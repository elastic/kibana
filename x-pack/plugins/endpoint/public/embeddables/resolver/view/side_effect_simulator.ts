/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { act } from '@testing-library/react';
import { SideEffectSimulator } from '../../types';

export const sideEffectSimulator: () => SideEffectSimulator = () => {
  let mockTime: number = 0;
  let frameRequestedCallbacksIDCounter: number = 0;
  const frameRequestedCallbacks: Map<number, FrameRequestCallback> = new Map();
  const provideAnimationFrame: () => void = () => {
    // TODO should we 'act'?
    act(() => {
      // Iterate the values, and clear the data set before calling the callbacks because the callbacks will repopulate the dataset synchronously in this testing framework.
      const values = [...frameRequestedCallbacks.values()];
      frameRequestedCallbacks.clear();
      for (const callback of values) {
        callback(mockTime);
      }
    });
  };

  const timestamp = jest.fn(() => mockTime);
  const requestAnimationFrame = jest.fn((callback: FrameRequestCallback): number => {
    const id = frameRequestedCallbacksIDCounter++;
    frameRequestedCallbacks.set(id, callback);
    return id;
  });
  const cancelAnimationFrame = jest.fn((id: number) => {
    frameRequestedCallbacks.delete(id);
  });

  return {
    controls: {
      provideAnimationFrame,

      set time(nextTime: number) {
        mockTime = nextTime;
      },
      get time() {
        return mockTime;
      },
    },
    mock: {
      requestAnimationFrame,
      cancelAnimationFrame,
      timestamp,
    },
  };
};
