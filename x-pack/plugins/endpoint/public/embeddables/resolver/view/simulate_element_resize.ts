/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as ResizeObserverNamespace from 'resize-observer-polyfill';

/**
 * A map of resize observers to the elements they observe.
 */
let mockObserved: Map<ResizeObserver, Set<Element>> | undefined;
/**
 * A map of resize observers to their callbacks.
 */
let mockCallbacks: Map<ResizeObserver, ResizeObserverCallback> | undefined;

/**
 * TODO
 */
let mockContentRects: Map<Element, DOMRectReadOnly> | undefined;

/**
 * Simulate an observed resize on `target`. Will trigger `ResizeObserver`'s and change its `getBoundingClientRect` return value.
 */
export const simulateElementResize: (
  target: Element,
  maybeContentRect?: DOMRectReadOnly
) => void = (target, maybeContentRect?) => {
  /**
   * If `contentRect` isn't passed then use the default null one.
   */
  const contentRect: DOMRectReadOnly = maybeContentRect
    ? maybeContentRect
    : {
        width: 0,
        height: 0,
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
        x: 0,
        y: 0,
        toJSON() {
          return this;
        },
      };

  if (!mockContentRects) {
    mockContentRects = new Map();
  }
  if (!mockObserved) {
    mockObserved = new Map();
  }
  if (!mockCallbacks) {
    mockCallbacks = new Map();
  }
  /**
   * Store the `contentRect` so that the mock implement of `getBoundingClientRect` can return it.
   */
  mockContentRects.set(target, contentRect);

  for (const [resizeObserver, observedElements] of mockObserved.entries()) {
    for (const observedElement of observedElements) {
      if (observedElement === target) {
        const entries = [
          {
            contentRect,
            target,
          },
        ];
        /**
         * Call the callback provided by any `ResizeObserver` that observed this element.
         */
        const callback = mockCallbacks.get(resizeObserver);
        if (callback) {
          callback(entries, resizeObserver);
        }
      }
    }
  }
};

const mockGetBoundingClientRectImplementation = function(this: Element) {
  if (this) {
    if (!mockContentRects) {
      mockContentRects = new Map();
    }
    /**
     * If the element has a `contentRect` stored, use that.
     */
    const mockedValue = mockContentRects.get(this);
    if (mockedValue) {
      return mockedValue;
    }
  }
  return {
    width: 0,
    height: 0,
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    x: 0,
    y: 0,
    toJSON() {
      return this;
    },
  };
};

export const setup: (ElementConstructor: typeof Element) => void = ElementConstructor => {
  jest
    .spyOn(ElementConstructor.prototype, 'getBoundingClientRect')
    .mockImplementation(mockGetBoundingClientRectImplementation);
};

let MockResizeObserver: jest.Mock<ResizeObserver, [ResizeObserverCallback]> | null;

export const clear: () => void = () => {
  if (mockObserved) {
    mockObserved.clear();
  }
  if (mockCallbacks) {
    mockCallbacks.clear();
  }
  if (mockContentRects) {
    mockContentRects.clear();
  }
  if (MockResizeObserver) {
    MockResizeObserver.mockClear();
  }
};

type MockNamespace = jest.Mocked<typeof ResizeObserverNamespace> & {
  // TODO is this needed, if so, why?
  __esModule: true;
};

jest.mock(
  'resize-observer-polyfill',
  (): MockNamespace => {
    MockResizeObserver = jest.fn(function(callback: ResizeObserverCallback) {
      const resizeObserver: ResizeObserver = {
        /**
         * Add the element to the map so that later calls to `simulateElementResize` can trigger `callback`.
         */
        observe(target: Element) {
          if (!mockObserved) {
            mockObserved = new Map();
          }
          const elements = mockObserved.get(this);
          if (elements) {
            elements.add(target);
          } else {
            mockObserved.set(this, new Set([target]));
          }
        },
        /**
         * Remove the element from the map so that later calls to `simulateElementResize` will not trigger `callback`.
         */
        unobserve(target: Element) {
          if (!mockObserved) {
            mockObserved = new Map();
          }
          const elements = mockObserved.get(this);
          if (elements) {
            elements.delete(target);
          }
        },
        /**
         * Remove all elements from the map for this instance.
         */
        disconnect() {
          if (!mockObserved) {
            mockObserved = new Map();
          }
          const elements = mockObserved.get(this);
          if (elements) {
            for (const target of elements) {
              elements.delete(target);
            }
          }
        },
      };
      if (!mockCallbacks) {
        mockCallbacks = new Map();
      }
      mockCallbacks.set(resizeObserver, callback);
      return resizeObserver;
    });
    return {
      __esModule: true,
      /**
       * The constructor for ResizeObserver (mocked.)
       */
      default: MockResizeObserver,
    };
  }
);
