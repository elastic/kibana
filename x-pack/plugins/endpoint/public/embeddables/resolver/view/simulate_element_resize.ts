/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as ResizeObserverNamespace from 'resize-observer-polyfill';

/**
 * This module mocks `resize-observer-polyfill` and provides a function that simulates an element resizing. Calls to `getBoundingClientRect` will respect the simulated resizes if you use `mockGetBoundingClientRectImplementation`. Using this, you can test code that uses `ResizeObserver` and `.getBoundingClientRect`.
 *
 * Usage:
 *
 ```
  // This import must be higher than others as it uses `jest.mock`. Is there a better way? Mocking is not good.
  import { mockedResizeObserverNamespace } from './simulate_element_resize';

  const {
    simulateElementResize,
    mockGetBoundingClientRectImplementation,
    clear,
  } = mockedResizeObserverNamespace;

  describe('cool test', () => {
    beforeEach(() => {
      clear();

      // This is required if you want `getBoundingClientRect` to respect the values you pass to `simulateElementResize`
      jest
        .spyOn(Element.prototype, 'getBoundingClientRect')
        .mockImplementation(mockGetBoundingClientRectImplementation);
    })
    it('blah', () => {
      // you have an `Element` from something, e.g. `ref` on a React elemenet.
      // The second arg is of type `DOMRectReadOnly`
      act(() => {
        simulateElementResize(element, {
          width: 800,
          height: 600,
          left: 20,
          top: 20,
          right: 820,
          bottom: 620,
          x: 20,
          y: 20,
          toJSON() {
            return this;
          },
        });
      });
    })
  })
  ```
 *
 */
type MockNamespace = jest.Mocked<typeof ResizeObserverNamespace> & {
  /**
   * A map of resize observers to the elements they observe.
   */
  observed: Map<ResizeObserver, Set<Element>>;
  /**
   * A map of resize observers to their callbacks.
   */
  callbacks: Map<ResizeObserver, ResizeObserverCallback>;
  /**
   * Simulate an observed resize on `target`. Will trigger `ResizeObserver`'s and change its `getBoundingClientRect` return value.
   */
  simulateElementResize: (target: Element, maybeContentRect?: DOMRectReadOnly) => void;
  /**
   * A mock implemenetation to be set using `jest.spyOn`. This is exposed because jest mocks cannot access `Element`.
   * 
   * ```
    jest
      .spyOn(Element.prototype, 'getBoundingClientRect')
      .mockImplementation(mockGetBoundingClientRectImplementation);
   * ```
   */
  mockGetBoundingClientRectImplementation: () => DOMRect;

  /**
   * Clear the mock data.
   */
  clear: () => void;
  __esModule: true;
};

jest.mock(
  'resize-observer-polyfill',
  (): MockNamespace => {
    const observed: MockNamespace['observed'] = new Map();
    const callbacks: MockNamespace['callbacks'] = new Map();
    const contentRects: Map<Element, DOMRectReadOnly> = new Map();

    const ResizeObserver = jest.fn(function(callback: ResizeObserverCallback) {
      const resizeObserver: ResizeObserver = {
        /**
         * Add the element to the map so that later calls to `simulateElementResize` can trigger `callback`.
         */
        observe(target: Element) {
          const elements = observed.get(this);
          if (elements) {
            elements.add(target);
          } else {
            observed.set(this, new Set([target]));
          }
        },
        /**
         * Remove the element from the map so that later calls to `simulateElementResize` will not trigger `callback`.
         */
        unobserve(target: Element) {
          const elements = observed.get(this);
          if (elements) {
            elements.delete(target);
          }
        },
        /**
         * Remove all elements from the map for this instance.
         */
        disconnect() {
          const elements = observed.get(this);
          if (elements) {
            for (const target of elements) {
              elements.delete(target);
            }
          }
        },
      };
      callbacks.set(resizeObserver, callback);
      return resizeObserver;
    });

    return {
      __esModule: true,
      callbacks,
      observed,
      clear() {
        observed.clear();
        callbacks.clear();
        contentRects.clear();
        ResizeObserver.mockClear();
      },
      simulateElementResize: (target, maybeContentRect?) => {
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
        contentRects.set(target, contentRect);

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
      },
      mockGetBoundingClientRectImplementation(this: Element) {
        if (this) {
          /**
           * If the element has a `contentRect` stored, use that.
           */
          const mockedValue = contentRects.get(this);
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
      },
      /**
       * The constructor for ResizeObserver (mocked.)
       */
      default: ResizeObserver,
    };
  }
);

export const mockedResizeObserverNamespace: MockNamespace = (ResizeObserverNamespace as unknown) as MockNamespace;
