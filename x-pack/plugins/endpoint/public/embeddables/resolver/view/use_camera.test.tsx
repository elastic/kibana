/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * This import must be hoisted as it uses `jest.mock`. Is there a better way? Mocking is not good.
 */
import React from 'react';
import { render, act, RenderResult } from '@testing-library/react';
import { useCamera } from './use_camera';
import { Provider } from 'react-redux';
import { storeFactory } from '../store';
import { Matrix3, SideEffectors } from '../types';
import { SideEffectContext } from './side_effect_context';

describe('useCamera on an unpainted element', () => {
  let reactRootElement: HTMLElement;
  let projectionMatrix: Matrix3;
  let time: number;
  let frameRequestedCallbacks: FrameRequestCallback[];
  let provideFrame: () => void;
  const testID = 'camera';
  let reactRenderQueries: RenderResult;
  beforeEach(async () => {
    const { store } = storeFactory();

    const Test = function Test() {
      const camera = useCamera();
      const { ref, onMouseDown } = camera;
      projectionMatrix = camera.projectionMatrix;
      return <div data-testid={testID} onMouseDown={onMouseDown} ref={ref} />;
    };

    time = 0;
    frameRequestedCallbacks = [];

    provideFrame = () => {
      for (const callback of frameRequestedCallbacks) {
        callback(time);
      }
      frameRequestedCallbacks.length = 0;
    };

    class MockResizeObserver implements ResizeObserver {
      static instances: Set<MockResizeObserver> = new Set();
      static simulateElementResize: (target: Element, contentRect: DOMRect) => void = (
        target,
        contentRect
      ) => {
        for (const instance of MockResizeObserver.instances) {
          instance.simulateElementResize(target, contentRect);
        }
      };
      constructor(private readonly callback: ResizeObserverCallback) {
        MockResizeObserver.instances.add(this);
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

    const sideEffectors: SideEffectors = {
      timestamp: jest.fn().mockImplementation(),
      requestAnimationFrame: jest.fn().mockImplementation(),
      ResizeObserver: MockResizeObserver,
    };

    reactRenderQueries = render(
      <Provider store={store}>
        <SideEffectContext.Provider value={sideEffectors}>
          <Test />
        </SideEffectContext.Provider>
      </Provider>
    );
  });
  it('should be usable in React', async () => {
    const { findByTestId } = reactRenderQueries;
    reactRootElement = await findByTestId(testID);
    expect(reactRootElement).toBeInTheDocument();
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
  /*
  describe('which has been resize to 800x400', () => {
    test('provides a projection matrix', () => {
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
   */
});
