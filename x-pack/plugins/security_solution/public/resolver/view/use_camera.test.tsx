/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { render, act, RenderResult, fireEvent } from '@testing-library/react';
import { renderHook, act as hooksAct } from '@testing-library/react-hooks';
import { useCamera, useAutoUpdatingClientRect } from './use_camera';
import { Provider } from 'react-redux';
import * as selectors from '../store/selectors';
import { storeFactory } from '../store';
import { Matrix3, ResolverStore, SideEffectSimulator } from '../types';
import { ResolverEvent } from '../../../common/endpoint/types';
import { SideEffectContext } from './side_effect_context';
import { applyMatrix3 } from '../models/vector2';
import { sideEffectSimulator } from './side_effect_simulator';
import { mockProcessEvent } from '../models/process_event_test_helpers';
import { mock as mockResolverTree } from '../models/resolver_tree';
import { ResolverAction } from '../store/actions';

describe('useCamera on an unpainted element', () => {
  let element: HTMLElement;
  let projectionMatrix: Matrix3;
  const testID = 'camera';
  let reactRenderResult: RenderResult;
  let store: ResolverStore;
  let simulator: SideEffectSimulator;

  beforeEach(async () => {
    store = storeFactory();

    const Test = function Test() {
      const camera = useCamera();
      const { ref, onMouseDown } = camera;
      projectionMatrix = camera.projectionMatrix;
      return <div data-test-subj={testID} onMouseDown={onMouseDown} ref={ref} />;
    };

    simulator = sideEffectSimulator();

    reactRenderResult = render(
      <Provider store={store}>
        <SideEffectContext.Provider value={simulator.mock}>
          <Test />
        </SideEffectContext.Provider>
      </Provider>
    );

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
        simulator.controls.simulateElementResize(element, {
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
    test('should observe all resize reference changes', async () => {
      const wrapper: FunctionComponent = ({ children }) => (
        <Provider store={store}>
          <SideEffectContext.Provider value={simulator.mock}>{children}</SideEffectContext.Provider>
        </Provider>
      );

      const { result } = renderHook(() => useAutoUpdatingClientRect(), { wrapper });
      const resizeObserverSpy = jest.spyOn(simulator.mock.ResizeObserver.prototype, 'observe');

      let [rect, ref] = result.current;
      hooksAct(() => ref(element));
      expect(resizeObserverSpy).toHaveBeenCalledWith(element);

      const div = document.createElement('div');
      hooksAct(() => ref(div));
      expect(resizeObserverSpy).toHaveBeenCalledWith(div);

      [rect, ref] = result.current;
      expect(rect?.width).toBe(0);
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
            1.0292841801261479,
            0,
            400,
            0,
            -1.0292841801261479,
            300,
            0,
            0,
            0,
          ]
        `);
      });
    });

    it('should not initially request an animation frame', () => {
      expect(simulator.mock.requestAnimationFrame).not.toHaveBeenCalled();
    });
    describe('when the camera begins animation', () => {
      let process: ResolverEvent;
      beforeEach(() => {
        const events: ResolverEvent[] = [];
        const numberOfEvents: number = 10;

        for (let index = 0; index < numberOfEvents; index++) {
          const uniquePpid = index === 0 ? undefined : index - 1;
          events.push(
            mockProcessEvent({
              endgame: {
                unique_pid: index,
                unique_ppid: uniquePpid,
                event_type_full: 'process_event',
                event_subtype_full: 'creation_event',
              },
            })
          );
        }
        const tree = mockResolverTree({ events });
        if (tree !== null) {
          const serverResponseAction: ResolverAction = {
            type: 'serverReturnedResolverData',
            payload: { result: tree, databaseDocumentID: '' },
          };
          act(() => {
            store.dispatch(serverResponseAction);
          });
        } else {
          throw new Error('failed to create tree');
        }
        const processes: ResolverEvent[] = [
          ...selectors
            .processNodePositionsAndEdgeLineSegments(store.getState())
            .processNodePositions.keys(),
        ];
        process = processes[processes.length - 1];
        if (!process) {
          throw new Error('missing the process to bring into view');
        }
        simulator.controls.time = 0;
        const cameraAction: ResolverAction = {
          type: 'userBroughtProcessIntoView',
          payload: {
            time: simulator.controls.time,
            process,
          },
        };
        act(() => {
          store.dispatch(cameraAction);
        });
      });

      it('should request animation frames in a loop', () => {
        const animationDuration = 1000;
        // When the animation begins, the camera should request an animation frame.
        expect(simulator.mock.requestAnimationFrame).toHaveBeenCalledTimes(1);

        // Update the time so that the animation is partially complete.
        simulator.controls.time = animationDuration / 5;
        // Provide the animation frame, allowing the camera to rerender.
        simulator.controls.provideAnimationFrame();

        // The animation is not complete, so the camera should request another animation frame.
        expect(simulator.mock.requestAnimationFrame).toHaveBeenCalledTimes(2);

        // Update the camera so that the animation is nearly complete.
        simulator.controls.time = (animationDuration / 10) * 9;

        // Provide the animation frame
        simulator.controls.provideAnimationFrame();

        // Since the animation isn't complete, it should request another frame
        expect(simulator.mock.requestAnimationFrame).toHaveBeenCalledTimes(3);

        // Animation lasts 1000ms, so this should end it
        simulator.controls.time = animationDuration * 1.1;

        // Provide the last frame
        simulator.controls.provideAnimationFrame();

        // Since animation is complete, it should not have requseted another frame
        expect(simulator.mock.requestAnimationFrame).toHaveBeenCalledTimes(3);
      });
    });
  });
});
