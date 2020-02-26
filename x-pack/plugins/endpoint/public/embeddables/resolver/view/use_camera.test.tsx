/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, act, RenderResult, fireEvent } from '@testing-library/react';
import { useCamera } from './use_camera';
import { Provider } from 'react-redux';
import * as selectors from '../store/selectors';
import { storeFactory } from '../store';
import { Matrix3, ResolverAction, ResolverStore, SideEffectSimulator } from '../types';
import { LegacyEndpointEvent } from '../../../../common/types';
import { SideEffectContext } from './side_effect_context';
import { applyMatrix3 } from '../lib/vector2';
import { sideEffectSimulator } from './side_effect_simulator';

describe('useCamera on an unpainted element', () => {
  let element: HTMLElement;
  let projectionMatrix: Matrix3;
  const testID = 'camera';
  let reactRenderResult: RenderResult;
  let store: ResolverStore;
  let simulator: SideEffectSimulator;

  beforeEach(async () => {
    ({ store } = storeFactory());

    const Test = function Test() {
      const camera = useCamera();
      const { ref, onMouseDown } = camera;
      projectionMatrix = camera.projectionMatrix;
      return <div data-testid={testID} onMouseDown={onMouseDown} ref={ref} />;
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

    it('should not initially request an animation frame', () => {
      expect(simulator.mock.requestAnimationFrame).not.toHaveBeenCalled();
    });
    describe('when the camera begins animation', () => {
      let process: LegacyEndpointEvent;
      beforeEach(() => {
        const serverResponseAction: ResolverAction = {
          type: 'serverReturnedResolverData',
          payload: {
            data: {
              result: {
                search_results: [
                  {
                    '@timestamp': 1582233383000,
                    agent: {
                      id: '5f78bf8f-ddee-4890-ad61-6b5182309639',
                      type: 'endgame',
                      version: '3.53.9',
                    },
                    endgame: {
                      event_subtype_full: 'creation_event',
                      event_type_full: 'process_event',
                      pid: 6508,
                      ppid: 3828,
                      process_name: 'mimikatz.exe',
                      process_path: 'C:\\Users\\zeus\\Desktop\\mimikatz.exe',
                      serial_event_id: 3096,
                      timestamp_utc: '2020-02-20 21:16:23Z',
                      unique_pid: 3096,
                      unique_ppid: 2732,
                    },
                    process: {
                      args: ['C:\\Users\\zeus\\Desktop\\mimikatz.exe'],
                      executable: 'C:\\Users\\zeus\\Desktop\\mimikatz.exe',
                      hash: {
                        md5: '9cd25cee26f115876f1592dcc63cc650',
                        sha1: '40963139cc017a296cb9826c88749099ffdf413e',
                        sha256: 'ece23612029589623e0ae27da942440a9b0a9cd4f9681ec866613e64a247969d',
                      },
                      name: 'mimikatz.exe',
                      parent: {
                        executable:
                          'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
                        name: 'powershell.exe',
                        pid: 3828,
                      },
                      pid: 6508,
                      ppid: 3828,
                      thread: {},
                    },
                    rule: {},
                    user: {
                      domain: 'DESKTOP-QBBSCUT',
                      group: {},
                      id: 'S-1-5-21-4215045029-3277270250-148079304-1004',
                      name: 'zeus',
                    },
                  },
                  {
                    '@timestamp': 1582233383000,
                    agent: {
                      id: '5f78bf8f-ddee-4890-ad61-6b5182309639',
                      type: 'endgame',
                      version: '3.53.9',
                    },
                    endgame: {
                      event_subtype_full: 'creation_event',
                      event_type_full: 'process_event',
                      pid: 6509,
                      ppid: 6508,
                      process_name: 'mimikatz.exe',
                      process_path: 'C:\\Users\\zeus\\Desktop\\mimikatz.exe',
                      serial_event_id: 3097,
                      timestamp_utc: '2020-02-20 21:16:23Z',
                      unique_pid: 3097,
                      unique_ppid: 3096,
                    },
                    process: {
                      args: ['C:\\Users\\zeus\\Desktop\\mimikatz.exe'],
                      executable: 'C:\\Users\\zeus\\Desktop\\mimikatz.exe',
                      hash: {
                        md5: '9cd25cee26f115876f1592dcc63cc650',
                        sha1: '40963139cc017a296cb9826c88749099ffdf413e',
                        sha256: 'ece23612029589623e0ae27da942440a9b0a9cd4f9681ec866613e64a247969d',
                      },
                      name: 'mimikatz.exe',
                      parent: {
                        executable: 'C:\\test.exe',
                        name: 'powershell.exe',
                        pid: 3828,
                      },
                      pid: 6509,
                      ppid: 6508,
                      thread: {},
                    },
                    rule: {},
                    user: {
                      domain: 'DESKTOP-QBBSCUT',
                      group: {},
                      id: 'S-1-5-21-4215045029-3277270250-148079304-1004',
                      name: 'zeus',
                    },
                  },
                ],
              },
            },
          },
        };
        act(() => {
          store.dispatch(serverResponseAction);
        });
        const processes: LegacyEndpointEvent[] = [
          ...selectors
            .processNodePositionsAndEdgeLineSegments(store.getState())
            .processNodePositions.keys(),
        ];
        process = processes[processes.length - 1];
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
