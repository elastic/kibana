/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createStore, Store, Reducer } from 'redux';
import { cameraReducer, cameraInitialState } from './reducer';
import { CameraState, Vector2 } from '../../types';
import * as selectors from './selectors';
import { animatePanning } from './methods';
import { lerp } from '../../lib/math';
import { ResolverAction } from '../actions';

type TestAction =
  | ResolverAction
  | {
      readonly type: 'animatePanning';
      readonly payload: {
        /**
         * The start time of the animation.
         */
        readonly time: number;
        /**
         * The duration of the animation.
         */
        readonly duration: number;
        /**
         * The target translation the camera will animate towards.
         */
        readonly targetTranslation: Vector2;
      };
    };

describe('when the camera is created', () => {
  let store: Store<CameraState, TestAction>;
  beforeEach(() => {
    const testReducer: Reducer<CameraState, TestAction> = (
      state = cameraInitialState(),
      action
    ): CameraState => {
      // If the test action is fired, call the animatePanning method
      if (action.type === 'animatePanning') {
        const {
          payload: { time, targetTranslation, duration },
        } = action;
        return animatePanning(state, time, targetTranslation, duration);
      }
      return cameraReducer(state, action);
    };
    store = createStore(testReducer);
  });

  it('should be at 0,0', () => {
    expect(selectors.translation(store.getState())(0)).toEqual([0, 0]);
  });
  it('should have scale of [1,1]', () => {
    expect(selectors.scale(store.getState())(0)).toEqual([1, 1]);
  });

  describe('When attempting to pan to current position and scale', () => {
    const duration = 1000;
    const startTime = 0;
    beforeEach(() => {
      const action: TestAction = {
        type: 'animatePanning',
        payload: {
          time: startTime,
          duration,
          targetTranslation: [0, 0],
        },
      };
      store.dispatch(action);
    });

    describe('when the animation is in progress', () => {
      let translationAtIntervals: Vector2[];
      let scaleAtIntervals: Vector2[];
      beforeEach(() => {
        translationAtIntervals = [];
        scaleAtIntervals = [];
        const state = store.getState();
        for (let progress = 0; progress <= 1; progress += 0.1) {
          translationAtIntervals.push(
            selectors.translation(state)(lerp(startTime, startTime + duration, progress))
          );
          scaleAtIntervals.push(
            selectors.scale(state)(lerp(startTime, startTime + duration, progress))
          );
        }
      });

      it('should not translate', () => {
        expect(translationAtIntervals.every(([x, y]: Vector2) => x === 0 && y === 0)).toBe(true);
      });

      it('should not scale', () => {
        expect(scaleAtIntervals.every(([x, y]: Vector2) => x === 1 && y === 1)).toBe(true);
      });
    });
  });

  describe('when animation begins', () => {
    const duration = 1000;
    let targetTranslation: Vector2;
    const startTime = 0;
    beforeEach(() => {
      // The distance the camera moves must be nontrivial in order to trigger a scale animation
      targetTranslation = [1000, 1000];
      const action: TestAction = {
        type: 'animatePanning',
        payload: {
          time: startTime,
          duration,
          targetTranslation,
        },
      };
      store.dispatch(action);
    });
    describe('when the animation is in progress', () => {
      let translationAtIntervals: Vector2[];
      let scaleAtIntervals: Vector2[];
      beforeEach(() => {
        translationAtIntervals = [];
        scaleAtIntervals = [];
        const state = store.getState();
        for (let progress = 0; progress <= 1; progress += 0.1) {
          translationAtIntervals.push(
            selectors.translation(state)(lerp(startTime, startTime + duration, progress))
          );
          scaleAtIntervals.push(
            selectors.scale(state)(lerp(startTime, startTime + duration, progress))
          );
        }
      });
      it('should gradually translate to the target', () => {
        expect(translationAtIntervals).toMatchInlineSnapshot(`
          Array [
            Array [
              0,
              0,
            ],
            Array [
              4.000000000000001,
              4.000000000000001,
            ],
            Array [
              32.00000000000001,
              32.00000000000001,
            ],
            Array [
              108.00000000000004,
              108.00000000000004,
            ],
            Array [
              256.00000000000006,
              256.00000000000006,
            ],
            Array [
              500,
              500,
            ],
            Array [
              744,
              744,
            ],
            Array [
              891.9999999999999,
              891.9999999999999,
            ],
            Array [
              968,
              968,
            ],
            Array [
              996,
              996,
            ],
            Array [
              1000,
              1000,
            ],
          ]
        `);
      });
      it('should gradually zoom in and out to the target', () => {
        expect(scaleAtIntervals).toMatchInlineSnapshot(`
          Array [
            Array [
              1,
              1,
            ],
            Array [
              0.9873589660765236,
              0.9873589660765236,
            ],
            Array [
              0.8988717286121894,
              0.8988717286121894,
            ],
            Array [
              0.7060959612791753,
              0.7060959612791753,
            ],
            Array [
              0.6176087238148411,
              0.6176087238148411,
            ],
            Array [
              0.6049676898913647,
              0.6049676898913647,
            ],
            Array [
              0.6176087238148411,
              0.6176087238148411,
            ],
            Array [
              0.7060959612791753,
              0.7060959612791753,
            ],
            Array [
              0.8988717286121893,
              0.8988717286121893,
            ],
            Array [
              0.9873589660765237,
              0.9873589660765237,
            ],
            Array [
              1,
              1,
            ],
          ]
        `);
      });
    });
  });
});
