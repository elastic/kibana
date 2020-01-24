/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Store, createStore } from 'redux';
import { cameraReducer } from './reducer';
import { CameraState, Vector2 } from '../../types';
import { CameraAction } from './action';
import { translation } from './selectors';

describe('panning interaction', () => {
  let store: Store<CameraState, CameraAction>;
  let translationShouldBeCloseTo: (expectedTranslation: Vector2) => void;

  beforeEach(() => {
    store = createStore(cameraReducer, undefined);
    translationShouldBeCloseTo = expectedTranslation => {
      const actualTranslation = translation(store.getState())(new Date(0));
      expect(expectedTranslation[0]).toBeCloseTo(actualTranslation[0]);
      expect(expectedTranslation[1]).toBeCloseTo(actualTranslation[1]);
    };
  });
  describe('when the raster size is 300 x 200 pixels', () => {
    beforeEach(() => {
      const action: CameraAction = { type: 'userSetRasterSize', payload: [300, 200] };
      store.dispatch(action);
    });
    it('should have a translation of 0,0', () => {
      translationShouldBeCloseTo([0, 0]);
    });
    describe('when the user has started panning at (100, 100)', () => {
      beforeEach(() => {
        const action: CameraAction = {
          type: 'userStartedPanning',
          payload: { screenCoordinates: [100, 100], time: new Date(0) },
        };
        store.dispatch(action);
      });
      it('should have a translation of 0,0', () => {
        translationShouldBeCloseTo([0, 0]);
      });
      describe('when the user moves their pointer 50px up and right (towards the top right of the screen)', () => {
        beforeEach(() => {
          const action: CameraAction = {
            type: 'userMovedPointer',
            payload: { screenCoordinates: [150, 50], time: new Date(0) },
          };
          store.dispatch(action);
        });
        it('should have a translation of [-50, -50] as the camera is now focused on things lower and to the left.', () => {
          translationShouldBeCloseTo([-50, -50]);
        });
        describe('when the user then stops panning', () => {
          beforeEach(() => {
            const action: CameraAction = { type: 'userStoppedPanning' };
            store.dispatch(action);
          });
          it('should still have a translation of [-50, -50]', () => {
            translationShouldBeCloseTo([-50, -50]);
          });
        });
      });
    });
  });
  describe('when the user nudges the camera up', () => {
    beforeEach(() => {
      const action: CameraAction = {
        type: 'userNudgedCamera',
        payload: { direction: [0, 1], time: new Date(0) },
      };
      store.dispatch(action);
    });
    it('the camera eventually moves up so that objects appear closer to the bottom of the screen', () => {
      const actual: Vector2 = translation(store.getState())(new Date(100));
      expect(actual).toMatchInlineSnapshot(`
        Array [
          0,
          7.407407407407405,
        ]
      `);
    });
  });
});
