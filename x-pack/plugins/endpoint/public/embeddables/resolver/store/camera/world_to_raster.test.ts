/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Store, createStore } from 'redux';
import { CameraAction, UserSetRasterSize, UserPanned, UserScaled } from './action';
import { CameraState } from '../../types';
import { cameraReducer } from './reducer';
import { worldToRaster } from './selectors';

describe('worldToRaster', () => {
  let store: Store<CameraState, CameraAction>;
  beforeEach(() => {
    store = createStore(cameraReducer, undefined);
  });
  describe('when the raster size is 300 x 200 pixels', () => {
    beforeEach(() => {
      const action: UserSetRasterSize = { type: 'userSetRasterSize', payload: [300, 200] };
      store.dispatch(action);
    });
    it('should convert 0,0 (center) in world space to 150,100 in raster space', () => {
      expect(worldToRaster(store.getState())([0, 0])).toEqual([150, 100]);
    });
    // top
    it('should convert 0,100 (top) in world space to 150,0 in raster space', () => {
      expect(worldToRaster(store.getState())([0, 100])).toEqual([150, 0]);
    });
    it('should convert 150,100 (top right) in world space to 300,0 in raster space', () => {
      expect(worldToRaster(store.getState())([150, 100])).toEqual([300, 0]);
    });
    it('should convert 150,0 (right) in world space to 300,100 in raster space', () => {
      expect(worldToRaster(store.getState())([150, 0])).toEqual([300, 100]);
    });
    it('should convert 150,-100 (right bottom) in world space to 300,200 in raster space', () => {
      expect(worldToRaster(store.getState())([150, -100])).toEqual([300, 200]);
    });
    it('should convert 0,-100 (bottom) in world space to 150,200 in raster space', () => {
      expect(worldToRaster(store.getState())([0, -100])).toEqual([150, 200]);
    });
    it('should convert -150,-100 (bottom left) in world space to 0,200 in raster space', () => {
      expect(worldToRaster(store.getState())([-150, -100])).toEqual([0, 200]);
    });
    it('should convert -150,0 (left) in world space to 0,100 in raster space', () => {
      expect(worldToRaster(store.getState())([-150, 0])).toEqual([0, 100]);
    });
    it('should convert -150,100 (top left) in world space to 0,100 in raster space', () => {
      expect(worldToRaster(store.getState())([-150, 100])).toEqual([0, 0]);
    });
    describe('when the user has zoomed to 0.5', () => {
      beforeEach(() => {
        const action: UserScaled = { type: 'userScaled', payload: [0.5, 0.5] };
        store.dispatch(action);
      });
      it('should convert 0, 0 (center) in world space to 150, 100 (center)', () => {
        expect(worldToRaster(store.getState())([0, 0])).toEqual([150, 100]);
      });
    });
    describe('when the user has panned to the right and up by 50', () => {
      beforeEach(() => {
        const action: UserPanned = { type: 'userPanned', payload: [-50, -50] };
        store.dispatch(action);
      });
      it('should convert 0,0 (center) in world space to 100,150 in raster space', () => {
        expect(worldToRaster(store.getState())([0, 0]).toString()).toEqual([100, 150].toString());
      });
      it('should convert 50,50 (right and up a bit) in world space to 150,100 (center) in raster space', () => {
        expect(worldToRaster(store.getState())([50, 50]).toString()).toEqual([150, 100].toString());
      });
      it('should convert 60,-60 (right and down a bit) in world space to 160,210 (center) in raster space', () => {
        expect(worldToRaster(store.getState())([60, -60]).toString()).toEqual(
          [160, 210].toString()
        );
      });
    });
    describe('when the user has panned to the right by 350 and up by 250', () => {
      beforeEach(() => {
        const action: UserPanned = { type: 'userPanned', payload: [-350, -250] };
        store.dispatch(action);
      });
      describe('when the user has scaled to 2', () => {
        // the viewport will only cover half, or 150x100 instead of 300x200
        beforeEach(() => {
          const action: UserScaled = { type: 'userScaled', payload: [2, 2] };
          store.dispatch(action);
        });
        // we expect the viewport to be
        // minX = 350 - (150/2) = 275
        // maxX = 350 + (150/2) = 425
        // minY = 250 - (100/2) = 200
        // maxY = 250 + (100/2) = 300
        it('should convert 350,250 in world space to 150,100 (center) in raster space', () => {
          expect(worldToRaster(store.getState())([350, 250]).toString()).toEqual(
            [150, 100].toString()
          );
        });
        it('should convert 275,300 in world space to 0,0 (top left) in raster space', () => {
          expect(worldToRaster(store.getState())([275, 300]).toString()).toEqual([0, 0].toString());
        });
      });
    });
  });
});
