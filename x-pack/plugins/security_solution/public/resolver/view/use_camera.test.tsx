/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// Extend jest with a custom matcher
import '../test_utilities/extend_jest';

import { mount, ReactWrapper } from 'enzyme';
import React from 'react';
import { useCamera } from './use_camera';
import { Provider } from 'react-redux';
import * as selectors from '../store/selectors';
import { Matrix3, ResolverStore, SideEffectors, SideEffectSimulator } from '../types';
import { ResolverNode } from '../../../common/endpoint/types';
import { SideEffectContext } from './side_effect_context';
import { applyMatrix3 } from '../models/vector2';
import { sideEffectSimulatorFactory } from './side_effect_simulator_factory';
import { mock as mockResolverTree } from '../models/resolver_tree';
import { ResolverAction } from '../store/actions';
import { createStore } from 'redux';
import { resolverReducer } from '../store/reducer';
import { mockTreeFetcherParameters } from '../mocks/tree_fetcher_parameters';
import * as nodeModel from '../../../common/endpoint/models/node';
import { act } from 'react-dom/test-utils';
import { mockResolverNode } from '../mocks/resolver_node';
import { endpointSourceSchema } from '../mocks/tree_schema';

describe('useCamera on an unpainted element', () => {
  /** Enzyme full DOM wrapper for the element the camera is attached to. */
  let element: ReactWrapper;
  /**
   * Enzyme full DOM wrapper for the alternate element that the camera can be attached to. Used for testing that the `ResizeObserver` attaches itself to the latest `ref`.
   */
  let alternateElement: ReactWrapper;
  /**
   * projection matrix returned by camera on last render.
   */
  let projectionMatrix: Matrix3;
  /**
   * A `data-test-subj` ID used to identify the element the camera normally attaches to.
   */
  const testID = 'camera';
  /**
   * A `data-test-subj` ID used to identify the element the camera alternatively attaches to.
   */
  const alternateTestID = 'alternate';
  /**
   * Returned by the legacy framework's render/mount function.
   */
  let wrapper: ReactWrapper;
  let store: ResolverStore;
  let simulator: SideEffectSimulator;

  /** Used to find an element by the data-test-subj attribute.
   */
  let domElementByTestSubj: (testSubj: string) => ReactWrapper;

  /**
   * Yield the result of `mapper` over and over, once per event-loop cycle.
   * After 10 times, quit.
   * Use this to continually check a value. See `toYieldEqualTo`.
   */
  async function* map<R>(mapper: () => R): AsyncIterable<R> {
    let timeoutCount = 0;
    while (timeoutCount < 10) {
      timeoutCount++;
      yield mapper();
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          wrapper.update();
          resolve();
        }, 0);
      });
    }
  }

  function TestWrapper({
    useSecondElement: useAlternateElement = false,
    resolverStore,
    sideEffectors,
  }: {
    /**
     * Pass `true`, to attach the camera to an alternate element. Used to test that the `ResizeObserver` attaches itself to the latest `ref`.
     */
    useSecondElement?: boolean;
    resolverStore: ResolverStore;
    sideEffectors: SideEffectors;
  }) {
    return (
      <Provider store={resolverStore}>
        <SideEffectContext.Provider value={sideEffectors}>
          <Test useAlternateElement={useAlternateElement} />
        </SideEffectContext.Provider>
      </Provider>
    );
  }

  function Test({
    useAlternateElement = false,
  }: {
    /**
     * Pass `true`, to attach the camera to an alternate element. Used to test that the `ResizeObserver` attaches itself to the latest `ref`.
     */
    useAlternateElement?: boolean;
  }) {
    const camera = useCamera();
    const { ref, onMouseDown } = camera;
    projectionMatrix = camera.projectionMatrix;
    return useAlternateElement ? (
      <>
        <div data-test-subj={testID} onMouseDown={onMouseDown} ref={ref} />
        <div data-test-subj={alternateTestID} />
      </>
    ) : (
      <>
        <div data-test-subj={testID} />
        <div data-test-subj={alternateTestID} onMouseDown={onMouseDown} ref={ref} />
      </>
    );
  }

  beforeEach(async () => {
    store = createStore(resolverReducer);

    simulator = sideEffectSimulatorFactory();

    wrapper = mount(<TestWrapper resolverStore={store} sideEffectors={simulator.mock} />);

    domElementByTestSubj = (testSubj: string) =>
      wrapper
        .find(`[data-test-subj="${testSubj}"]`)
        // Omit React components that may be returned.
        .filterWhere((item) => typeof item.type() === 'string');

    element = domElementByTestSubj(testID);

    alternateElement = domElementByTestSubj(alternateTestID);
  });
  it('returns a projectionMatrix that changes everything to 0', () => {
    expect(applyMatrix3([0, 0], projectionMatrix)).toEqual([0, 0]);
  });
  describe('which has been resized to 800x600', () => {
    const width = 800;
    const height = 600;
    const leftMargin = 20;
    const topMargin = 20;
    const centerX = width / 2 + leftMargin;
    const centerY = height / 2 + topMargin;
    beforeEach(async () => {
      act(() => {
        simulator.controls.simulateElementResize(element.getDOMNode(), {
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

    it('provides a projection matrix that inverts the y axis and translates 400,300 (center of the element)', () => {
      expect(map(() => applyMatrix3([0, 0], projectionMatrix))).toYieldEqualTo([400, 300]);
    });
    describe('when the user presses the mousedown button in the middle of the element', () => {
      beforeEach(() => {
        element.simulate('mousedown', {
          clientX: centerX,
          clientY: centerY,
        });
      });
      describe('when the user moves the mouse 50 pixels to the right', () => {
        beforeEach(() => {
          element.simulate('mousemove', {
            clientX: centerX + 50,
            clientY: centerY,
          });
        });
        it('should project [0, 0] in world corrdinates 50 pixels to the right of the center of the element', () => {
          expect(map(() => applyMatrix3([0, 0], projectionMatrix))).toYieldEqualTo([450, 300]);
        });
      });
    });

    describe('when the user uses the mousewheel w/ ctrl held down', () => {
      beforeEach(() => {
        element.simulate('wheel', {
          ctrlKey: true,
          deltaY: -10,
          deltaMode: 0,
        });
      });
      it('should zoom in', () => {
        expect(map(() => projectionMatrix)).toYieldEqualTo([
          1.0292841801261479,
          0,
          400,
          0,
          -1.0292841801261479,
          300,
          0,
          0,
          0,
        ]);
      });
    });

    describe('when the element the camera is attached to is switched', () => {
      beforeEach(() => {
        wrapper.setProps({
          useAlternateElement: true,
        });
      });
      describe('and when that element changes size to 1200x800', () => {
        beforeEach(() => {
          act(() => {
            const alternateElementWidth = 1200;
            const alternateElementHeight = 800;
            simulator.controls.simulateElementResize(alternateElement.getDOMNode(), {
              width: alternateElementWidth,
              height: alternateElementHeight,
              left: leftMargin,
              top: topMargin,
              right: leftMargin + alternateElementWidth,
              bottom: topMargin + alternateElementHeight,
              x: leftMargin,
              y: topMargin,
              toJSON() {
                return this;
              },
            });
          });
        });
        it('provides a projection matrix that inverts the y axis and translates 600,400', () => {
          expect(map(() => applyMatrix3([0, 0], projectionMatrix))).toYieldEqualTo([600, 400]);
        });
      });
    });

    it('should not initially request an animation frame', () => {
      expect(simulator.mock.requestAnimationFrame).not.toHaveBeenCalled();
    });
    describe('when the camera begins animation', () => {
      let node: ResolverNode;
      beforeEach(async () => {
        const nodes: ResolverNode[] = [];
        const numberOfNodes: number = 10;

        for (let index = 0; index < numberOfNodes; index++) {
          const parentID = index === 0 ? undefined : String(index - 1);
          nodes.push(
            mockResolverNode({
              id: String(index),
              name: '',
              parentID,
              timestamp: 0,
              stats: { total: 0, byCategory: {} },
            })
          );
        }
        const tree = mockResolverTree({ nodes });
        if (tree !== null) {
          const { schema, dataSource } = endpointSourceSchema();
          const serverResponseAction: ResolverAction = {
            type: 'serverReturnedResolverData',
            payload: {
              result: tree,
              dataSource,
              schema,
              parameters: mockTreeFetcherParameters(),
            },
          };
          store.dispatch(serverResponseAction);
        } else {
          throw new Error('failed to create tree');
        }
        const resolverNodes: ResolverNode[] = [
          ...selectors.layout(store.getState()).processNodePositions.keys(),
        ];
        node = resolverNodes[resolverNodes.length - 1];
        if (!process) {
          throw new Error('missing the process to bring into view');
        }
        simulator.controls.time = 0;
        const nodeID = nodeModel.nodeID(node);
        if (!nodeID) {
          throw new Error('could not find nodeID for process');
        }
        const cameraAction: ResolverAction = {
          type: 'userBroughtNodeIntoView',
          payload: {
            time: simulator.controls.time,
            nodeID,
          },
        };
        store.dispatch(cameraAction);
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
