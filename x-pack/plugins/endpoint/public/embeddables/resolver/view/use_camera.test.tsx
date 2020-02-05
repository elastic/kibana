/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, act } from '@testing-library/react';
import { useCamera } from './use_camera';
import { Provider } from 'react-redux';
import { storeFactory } from '../store';
import * as ResizeObserverNamespace from 'resize-observer-polyfill';
import { Matrix3 } from '../types';

type MockResizeObserverElements = Map<ResizeObserver, Set<Element>>;
type MockResizeObserverCallbacks = Map<ResizeObserver, ResizeObserverCallback>;
type MockResizeObserverContentRects = Map<Element, DOMRectReadOnly>;
type MockResizeObserverMockGetBoundingClientRectImplementation = () => DOMRect;
type MockResizeObserverResizeElement = (
  target: Element,
  maybeContentRect?: DOMRectReadOnly
) => void;
type MockResizeObserverNamespace = jest.Mocked<typeof ResizeObserverNamespace> & {
  observed: MockResizeObserverElements;
  callbacks: MockResizeObserverCallbacks;
  resizeElement: MockResizeObserverResizeElement;
  mockGetBoundingClientRectImplementation: MockResizeObserverMockGetBoundingClientRectImplementation;
  __esModule: true;
};

jest.mock(
  'resize-observer-polyfill',
  (): MockResizeObserverNamespace => {
    const observed: MockResizeObserverElements = new Map();
    const callbacks: MockResizeObserverCallbacks = new Map();
    const contentRects: MockResizeObserverContentRects = new Map();

    const resizeElement: MockResizeObserverResizeElement = (target, maybeContentRect?) => {
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
            const callback = callbacks.get(resizeObserver);
            if (callback) {
              callback(entries, resizeObserver);
            }
          }
        }
      }
    };

    return {
      __esModule: true,
      callbacks,
      observed,
      resizeElement,
      mockGetBoundingClientRectImplementation(this: Element) {
        if (this) {
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
      default: jest.fn(function(callback: ResizeObserverCallback) {
        const resizeObserver: ResizeObserver = {
          observe(target: Element) {
            const elements = observed.get(this);
            if (elements) {
              elements.add(target);
            } else {
              observed.set(this, new Set([target]));
            }
          },
          unobserve(target: Element) {
            const elements = observed.get(this);
            if (elements) {
              elements.delete(target);
            }
          },
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
      }),
    };
  }
);

const mockedResizeObserverNamespace: MockResizeObserverNamespace = (ResizeObserverNamespace as unknown) as MockResizeObserverNamespace;

const {
  default: ResizeObserver,
  resizeElement,
  mockGetBoundingClientRectImplementation,
} = mockedResizeObserverNamespace;

describe('useCamera on an unpainted element', () => {
  let element: HTMLElement;
  let projectionMatrix: Matrix3;
  beforeEach(async () => {
    ResizeObserver.mockClear();

    jest
      .spyOn(Element.prototype, 'getBoundingClientRect')
      .mockImplementation(mockGetBoundingClientRectImplementation);

    const testID = 'camera';

    const { store } = storeFactory();

    const Test = function Test() {
      const camera = useCamera();
      const { ref, onMouseDown } = camera;
      projectionMatrix = camera.projectionMatrix;
      return <div data-testid={testID} onMouseDown={onMouseDown} ref={ref} />;
    };

    const { findByTestId } = render(
      <Provider store={store}>
        <Test />
      </Provider>
    );
    element = await findByTestId(testID);
    expect(element).toBeInTheDocument();
  });
  test('returns a busted projectionMatrix', async () => {
    // TODO fix
    expect(projectionMatrix).toMatchInlineSnapshot(`
      Array [
        NaN,
        NaN,
        NaN,
        NaN,
        NaN,
        NaN,
        NaN,
        NaN,
        NaN,
      ]
    `);
  });
  describe('which has been resize to 800x400', () => {
    beforeEach(() => {
      act(() => {
        resizeElement(element, {
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
    });
    test('provides a projection matrix', async () => {
      expect(projectionMatrix).toMatchInlineSnapshot(`
        Array [
          1,
          0,
          400,
          0,
          -1,
          300,
          0,
          0,
          0,
        ]
      `);
    });
  });
});
