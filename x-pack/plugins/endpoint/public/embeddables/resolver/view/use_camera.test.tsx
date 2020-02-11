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
import * as selectors from '../store/selectors';
import { storeFactory } from '../store';
import {
  Matrix3,
  SideEffectors,
  ResolverMiddleware,
  ResolverAction,
  ResolverStore,
  ProcessEvent,
  SideEffectSimulator,
} from '../types';
import { MockResizeObserver } from './mock_resize_observer';
import { SideEffectContext } from './side_effect_context';
import { applyMatrix3 } from '../lib/vector2';
import { sideEffectSimulator } from './side_effect_simulator';

describe('useCamera on an unpainted element', () => {
  let element: HTMLElement;
  let projectionMatrix: Matrix3;
  const testID = 'camera';
  let reactRenderResult: RenderResult;
  let simulateElementResize: (target: Element, contentRect: DOMRect) => void;
  let actions: ResolverAction[];
  let store: ResolverStore;
  let sideEffectors: jest.Mocked<Omit<SideEffectors, 'ResizeObserver'>> &
    Pick<SideEffectors, 'ResizeObserver'>;
  let controls: SideEffectSimulator['controls'];
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

    jest
      .spyOn(Element.prototype, 'getBoundingClientRect')
      .mockImplementation(function(this: Element) {
        return MockResizeObserver.contentRectForElement(this);
      });

    const simulator = sideEffectSimulator();
    controls = simulator.controls;

    sideEffectors = {
      ...simulator.mock,
      ResizeObserver: MockResizeObserver,
    };

    reactRenderResult = render(
      <Provider store={store}>
        <SideEffectContext.Provider value={sideEffectors}>
          <Test />
        </SideEffectContext.Provider>
      </Provider>
    );

    simulateElementResize = MockResizeObserver.simulateElementResize;
    const { findByTestId } = reactRenderResult;
    element = await findByTestId(testID);
  });
  afterEach(() => {
    jest.clearAllMocks();
  });
  it('should be usable in React', async () => {
    expect(element).toBeInTheDocument();
  });
  test('returns a projectionMatrix that changes everything to 0', () => {
    expect(applyMatrix3([0, 0], projectionMatrix)).toEqual([0, 0]);
  });
  describe('which has been resized to 800x600', () => {
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
    test('provides a projection matrix that inverts the y axis and translates 400,300 (center of the element)', () => {
      expect(applyMatrix3([0, 0], projectionMatrix)).toEqual([400, 300]);
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

    describe('when the user uses the mousewheel w/ ctrl held down', () => {
      beforeEach(() => {
        fireEvent.wheel(element, {
          ctrlKey: true,
          deltaY: -10,
          deltaMode: 0,
        });
      });
      it('should zoom in', () => {
        expect(projectionMatrix).toMatchInlineSnapshot(`
          Array [
            1.0635255481707058,
            0,
            400,
            0,
            -1.0635255481707058,
            300,
            0,
            0,
            0,
          ]
        `);
      });
    });

    // TODO, move to new module
    it('should not initially request an animation frame', () => {
      expect(sideEffectors.requestAnimationFrame).not.toHaveBeenCalled();
    });
    describe('when the camera begins animation', () => {
      let process: ProcessEvent;
      beforeEach(() => {
        /**
         * At this time, processes are provided via mock data. In the future, this test will have to provide those mocks.
         */
        const processes: ProcessEvent[] = [
          ...selectors
            .processNodePositionsAndEdgeLineSegments(store.getState())
            .processNodePositions.keys(),
        ];
        process = processes[processes.length - 1];
        controls.time = 0;
        const action: ResolverAction = {
          type: 'userBroughtProcessIntoView',
          payload: {
            time: controls.time,
            process,
          },
        };
        // does this need to be in act? prolly
        act(() => {
          store.dispatch(action);
        });
      });

      it('should request animation frames in a loop', () => {
        expect(sideEffectors.requestAnimationFrame).toHaveBeenCalledTimes(1);
        controls.time = 100;
        controls.provideAnimationFrame();
        expect(sideEffectors.requestAnimationFrame).toHaveBeenCalledTimes(2);
        controls.time = 900;
        controls.provideAnimationFrame();
        expect(sideEffectors.requestAnimationFrame).toHaveBeenCalledTimes(3);
        // Animation lasts 1000ms, so this should end it
        controls.time = 1001;
        controls.provideAnimationFrame();
        // Doesn't ask again, still 3
        expect(sideEffectors.requestAnimationFrame).toHaveBeenCalledTimes(3);
      });
    });
  });
});
