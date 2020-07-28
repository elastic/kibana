/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { act } from '@testing-library/react';
import { SideEffectSimulator } from '../types';

/**
 * Create mock `SideEffectors` for `SideEffectContext.Provider`. The `control`
 * object is used to control the mocks.
 */
export const sideEffectSimulator: () => SideEffectSimulator = () => {
  // The set of mock `ResizeObserver` instances that currently exist
  const resizeObserverInstances: Set<MockResizeObserver> = new Set();

  // A map of `Element`s to their fake `DOMRect`s
  const contentRects: Map<Element, DOMRect> = new Map();

  /**
   * Simulate an element's size changing. This will trigger any `ResizeObserverCallback`s which
   * are listening for this element's size changes. It will also cause `element.getBoundingClientRect` to
   * return `contentRect`
   */
  const simulateElementResize: (target: Element, contentRect: DOMRect) => void = (
    target,
    contentRect
  ) => {
    contentRects.set(target, contentRect);
    for (const instance of resizeObserverInstances) {
      instance.simulateElementResize(target, contentRect);
    }
  };

  /**
   * Get the simulate `DOMRect` for `element`.
   */
  const contentRectForElement: (target: Element) => DOMRect = (target) => {
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

  /**
   * Change `Element.prototype.getBoundingClientRect` to return our faked values.
   */
  jest
    .spyOn(Element.prototype, 'getBoundingClientRect')
    .mockImplementation(function (this: Element) {
      return contentRectForElement(this);
    });

  /**
   * A mock implementation of `ResizeObserver` that works with our fake `getBoundingClientRect` and `simulateElementResize`
   */
  class MockResizeObserver implements ResizeObserver {
    constructor(private readonly callback: ResizeObserverCallback) {
      resizeObserverInstances.add(this);
    }
    private elements: Set<Element> = new Set();
    /**
     * Simulate `target` changing it size to `contentRect`.
     */
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

  /**
   * milliseconds since epoch, faked.
   */
  let mockTime: number = 0;

  /**
   * A counter allowing us to give a unique ID for each call to `requestAnimationFrame`.
   */
  let frameRequestedCallbacksIDCounter: number = 0;

  /**
   * A map of requestAnimationFrame IDs to the related callbacks.
   */
  const frameRequestedCallbacks: Map<number, FrameRequestCallback> = new Map();

  /**
   * Trigger any pending `requestAnimationFrame` callbacks. Passes `mockTime` as the timestamp.
   */
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

  /**
   * Provide a fake ms timestamp
   */
  const timestamp = jest.fn(() => mockTime);

  /**
   * Fake `requestAnimationFrame`.
   */
  const requestAnimationFrame = jest.fn((callback: FrameRequestCallback): number => {
    const id = frameRequestedCallbacksIDCounter++;
    frameRequestedCallbacks.set(id, callback);
    return id;
  });

  /**
   * fake `cancelAnimationFrame`.
   */
  const cancelAnimationFrame = jest.fn((id: number) => {
    frameRequestedCallbacks.delete(id);
  });

  const retval: SideEffectSimulator = {
    controls: {
      provideAnimationFrame,

      /**
       * Change the mock time value
       */
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
