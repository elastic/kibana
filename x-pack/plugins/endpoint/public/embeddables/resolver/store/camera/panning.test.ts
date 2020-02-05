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
      const actualTranslation = translation(store.getState());
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
    describe('when the user has started panning', () => {
      beforeEach(() => {
        const action: CameraAction = { type: 'userStartedPanning', payload: [100, 100] };
        store.dispatch(action);
      });
      it('should have a translation of 0,0', () => {
        translationShouldBeCloseTo([0, 0]);
      });
      describe('when the user continues to pan 50px up and to the right', () => {
        beforeEach(() => {
          const action: CameraAction = { type: 'userMovedPointer', payload: [150, 50] };
          store.dispatch(action);
        });
        it('should have a translation of 50,50', () => {
          translationShouldBeCloseTo([50, 50]);
        });
        describe('when the user then stops panning', () => {
          beforeEach(() => {
            const action: CameraAction = { type: 'userStoppedPanning' };
            store.dispatch(action);
          });
          it('should have a translation of 50,50', () => {
            translationShouldBeCloseTo([50, 50]);
          });
        });
      });
    });
  });
  describe('panning controls', () => {
    describe('when user clicks on pan north button', () => {
      beforeEach(() => {
        const action: CameraAction = { type: 'userClickedPanControl', payload: 'north' };
        store.dispatch(action);
      });
      it('moves the camera south so that objects appear closer to the bottom of the screen', () => {
        const actual = translation(store.getState());
        expect(actual).toMatchInlineSnapshot(`
          Array [
            0,
            -32.49906769231164,
          ]
        `);
      });
    });
    describe('when user clicks on pan south button', () => {
      beforeEach(() => {
        const action: CameraAction = { type: 'userClickedPanControl', payload: 'south' };
        store.dispatch(action);
      });
      it('moves the camera north so that objects appear closer to the top of the screen', () => {
        const actual = translation(store.getState());
        expect(actual).toMatchInlineSnapshot(`
          Array [
            0,
            32.49906769231164,
          ]
        `);
      });
    });
    describe('when user clicks on pan east button', () => {
      beforeEach(() => {
        const action: CameraAction = { type: 'userClickedPanControl', payload: 'east' };
        store.dispatch(action);
      });
      it('moves the camera west so that objects appear closer to the left of the screen', () => {
        const actual = translation(store.getState());
        expect(actual).toMatchInlineSnapshot(`
          Array [
            -32.49906769231164,
            0,
          ]
        `);
      });
    });
    describe('when user clicks on pan west button', () => {
      beforeEach(() => {
        const action: CameraAction = { type: 'userClickedPanControl', payload: 'west' };
        store.dispatch(action);
      });
      it('moves the camera east so that objects appear closer to the right of the screen', () => {
        const actual = translation(store.getState());
        expect(actual).toMatchInlineSnapshot(`
          Array [
            32.49906769231164,
            0,
          ]
        `);
      });
    });
  });
});
