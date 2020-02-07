/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * This import must be hoisted as it uses `jest.mock`. Is there a better way? Mocking is not good.
 */
import React from 'react';
import { render, act, RenderResult, fireEvent } from '@testing-library/react';
import { useCamera } from './use_camera';
import { Provider } from 'react-redux';
import { storeFactory } from '../store';
import {
  Matrix3,
  SideEffectors,
  ResolverMiddleware,
  ResolverAction,
  ResolverStore,
} from '../types';
import { MockResizeObserver } from './mock_resize_observer';
import { SideEffectContext } from './side_effect_context';
import { applyMatrix3 } from '../lib/vector2';

describe('useCamera on an unpainted element', () => {
  let element: HTMLElement;
  let projectionMatrix: Matrix3;
  let time: number;
  let frameRequestedCallbacksIDCounter: number;
  let frameRequestedCallbacks: Map<number, FrameRequestCallback>;
  const testID = 'camera';
  let reactRenderQueries: RenderResult;
  let simulateElementResize: (target: Element, contentRect: DOMRect) => void;
  let actions: ResolverAction[];
  let store: ResolverStore;
  beforeEach(async () => {
    actions = [];
    const middleware: ResolverMiddleware = () => next => action => {
      actions.push(action);
      next(action);
    };
    ({ store } = storeFactory(middleware));

    const Test = function Test() {
      const camera = useCamera();
      const { ref, onMouseDown } = camera;
      projectionMatrix = camera.projectionMatrix;
      return <div data-testid={testID} onMouseDown={onMouseDown} ref={ref} />;
    };

    time = 0;
    frameRequestedCallbacksIDCounter = 0;
    frameRequestedCallbacks = new Map();

    jest
      .spyOn(Element.prototype, 'getBoundingClientRect')
      .mockImplementation(function(this: Element) {
        return MockResizeObserver.contentRectForElement(this);
      });

    const sideEffectors: SideEffectors = {
      timestamp: jest.fn().mockImplementation(),
      requestAnimationFrame: jest
        .fn()
        .mockImplementation((callback: FrameRequestCallback): number => {
          const id = frameRequestedCallbacksIDCounter++;
          frameRequestedCallbacks.set(id, callback);
          return id;
        }),
      ResizeObserver: MockResizeObserver,
    };

    reactRenderQueries = render(
      <Provider store={store}>
        <SideEffectContext.Provider value={sideEffectors}>
          <Test />
        </SideEffectContext.Provider>
      </Provider>
    );

    simulateElementResize = MockResizeObserver.simulateElementResize;
    const { findByTestId } = reactRenderQueries;
    element = await findByTestId(testID);
  });
  afterEach(() => {
    jest.clearAllMocks();
  });
  it('should be usable in React', async () => {
    expect(element).toBeInTheDocument();
  });
  test('returns a projectionMatrix that changes everything to 0', () => {
    expect(projectionMatrix).toMatchInlineSnapshot(`
      Array [
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
      ]
    `);
  });
  describe('which has been resize to 800x400', () => {
    const width = 800;
    const height = 600;
    const leftMargin = 20;
    const topMargin = 20;
    const centerX = width / 2 + leftMargin;
    const centerY = height / 2 + topMargin;
    beforeEach(() => {
      act(() => {
        simulateElementResize(element, {
          width,
          height,
          left: leftMargin,
          top: topMargin,
          right: leftMargin + width,
          bottom: topMargin + height,
          x: leftMargin,
          y: topMargin,
          toJSON() {
            return this;
          },
        });
      });
    });
    test('provides a projection matrix', () => {
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
    describe('when the user presses the mousedown button in the middle of the element', () => {
      beforeEach(() => {
        fireEvent.mouseDown(element, {
          clientX: centerX,
          clientY: centerY,
        });
      });
      describe('when the user moves the mouse 50 pixels to the right', () => {
        beforeEach(() => {
          fireEvent.mouseMove(element, {
            clientX: centerX + 50,
            clientY: centerY,
          });
        });
        it('should project [0, 0] in world corrdinates 50 pixels to the right of the center of the element', () => {
          expect(applyMatrix3([0, 0], projectionMatrix)).toEqual([450, 300]);
        });
      });
    });
  });
});
