/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * This import must be hoisted as it uses `jest.mock`. Is there a better way? Mocking is not good.
 */
import { setup, clear, simulateElementResize } from './testing_simulator';
import React from 'react';
import { render, act } from '@testing-library/react';
import { useCamera } from './use_camera';
import { Provider } from 'react-redux';
import { storeFactory } from '../store';
import { Matrix3 } from '../types';

describe('useCamera on an unpainted element', () => {
  let element: HTMLElement;
  let projectionMatrix: Matrix3;
  beforeEach(async () => {
    setup(Element, window);

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
  afterEach(() => {
    clear();
  });
  test('returns a projectionMatrix that changes everything to 0', async () => {
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
    beforeEach(() => {
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
