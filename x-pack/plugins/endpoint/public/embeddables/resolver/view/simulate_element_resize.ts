/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as ResizeObserverNamespace from 'resize-observer-polyfill';

interface MockState {
  /**
   * A map of resize observers to the elements they observe.
   */
  observed: Map<ResizeObserver, Set<Element>>;
  /**
   * A map of resize observers to their callbacks.
   */
  callbacks: Map<ResizeObserver, ResizeObserverCallback>;

  /**
   * TODO
   */
  domRects: Map<Element, DOMRectReadOnly>;
}

/**
 * Do not read directly, use `mockState`.
 */
let _mockState: MockState | undefined;

/**
 * Lazily create mockState, as the jest mock of `resize-observer-polyfill` will be hoisted to the top of this file,
 * it can only access lazily instantiated values which are created by other hoisted code.  Use a function statement,
 * these are hoisted.
 * Mocking is bad.
 */
function mockState(): MockState {
  if (!_mockState) {
    _mockState = {
      observed: new Map(),
      callbacks: new Map(),
      domRects: new Map(),
    };
  }
  return _mockState;
}

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

  /**
   * Store the `contentRect` so that the mock implement of `getBoundingClientRect` can return it.
   */
  const { domRects, observed, callbacks } = mockState();
  domRects.set(target, contentRect);

  for (const [resizeObserver, observedElements] of observed.entries()) {
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
        const callback = callbacks.get(resizeObserver);
        if (callback) {
          callback(entries, resizeObserver);
        }
      }
    }
  }
};

const mockGetBoundingClientRectImplementation = function(this: Element) {
  if (this) {
    /**
     * If the element has a `contentRect` stored, use that.
     */
    const mockedValue = mockState().domRects.get(this);
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
  const { observed, callbacks, domRects } = mockState();
  observed.clear();
  callbacks.clear();
  domRects.clear();
  if (MockResizeObserver) {
    MockResizeObserver.mockClear();
  }
};

type MockNamespace = jest.Mocked<typeof ResizeObserverNamespace> & {
  /**
   * Without this, the object is not recognized as an ES6 module correctly.
   */
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
          const { observed: mockObserved } = mockState();
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
          const { observed: mockObserved } = mockState();
          const elements = mockObserved.get(this);
          if (elements) {
            elements.delete(target);
          }
        },
        /**
         * Remove all elements from the map for this instance.
         */
        disconnect() {
          const { observed: mockObserved } = mockState();
          const elements = mockObserved.get(this);
          if (elements) {
            for (const target of elements) {
              elements.delete(target);
            }
          }
        },
      };
      mockState().callbacks.set(resizeObserver, callback);
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
