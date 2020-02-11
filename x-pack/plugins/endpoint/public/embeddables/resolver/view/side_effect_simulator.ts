/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { act } from '@testing-library/react';
import { SideEffectSimulator } from '../types';

export const sideEffectSimulator: () => SideEffectSimulator = () => {
  const resizeObserverInstances: Set<MockResizeObserver> = new Set();
  const contentRects: Map<Element, DOMRect> = new Map();
  const simulateElementResize: (target: Element, contentRect: DOMRect) => void = (
    target,
    contentRect
  ) => {
    contentRects.set(target, contentRect);
    for (const instance of resizeObserverInstances) {
      instance.simulateElementResize(target, contentRect);
    }
  };
  const contentRectForElement: (target: Element) => DOMRect = target => {
    if (contentRects.has(target)) {
      return contentRects.get(target)!;
    }
    const domRect: DOMRect = {
      x: 0,
      y: 0,
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      width: 0,
      height: 0,
      toJSON() {
        return this;
      },
    };
    return domRect;
  };
  jest
    .spyOn(Element.prototype, 'getBoundingClientRect')
    .mockImplementation(function(this: Element) {
      return contentRectForElement(this);
    });
  class MockResizeObserver implements ResizeObserver {
    constructor(private readonly callback: ResizeObserverCallback) {
      resizeObserverInstances.add(this);
    }
    private elements: Set<Element> = new Set();
    simulateElementResize(target: Element, contentRect: DOMRect) {
      if (this.elements.has(target)) {
        const entries: ResizeObserverEntry[] = [{ target, contentRect }];
        this.callback(entries, this);
      }
    }
    observe(target: Element) {
      this.elements.add(target);
    }
    unobserve(target: Element) {
      this.elements.delete(target);
    }
    disconnect() {
      this.elements.clear();
    }
  }
  let mockTime: number = 0;
  let frameRequestedCallbacksIDCounter: number = 0;
  const frameRequestedCallbacks: Map<number, FrameRequestCallback> = new Map();
  const provideAnimationFrame: () => void = () => {
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

  const retval: SideEffectSimulator = {
    controls: {
      provideAnimationFrame,

      set time(nextTime: number) {
        mockTime = nextTime;
      },
      get time() {
        return mockTime;
      },
      simulateElementResize,
    },
    mock: {
      requestAnimationFrame,
      cancelAnimationFrame,
      timestamp,
      ResizeObserver: MockResizeObserver,
    },
  };
  return retval;
};
