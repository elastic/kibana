/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Store, createStore } from 'redux';
import { CameraAction } from './action';
import { CameraState } from '../../types';
import { cameraReducer } from './reducer';
import { projectionMatrix } from './selectors';
import { applyMatrix3 } from '../../models/vector2';
import { scaleToZoom } from './scale_to_zoom';

describe('projectionMatrix', () => {
  let store: Store<CameraState, CameraAction>;
  let compare: (worldPosition: [number, number], expectedRasterPosition: [number, number]) => void;
  beforeEach(() => {
    store = createStore(cameraReducer, undefined);
    compare = (worldPosition: [number, number], expectedRasterPosition: [number, number]) => {
      // time isn't really relevant as we aren't testing animation
      const time = 0;
      const [rasterX, rasterY] = applyMatrix3(
        worldPosition,
        projectionMatrix(store.getState())(time)
      );
      expect(rasterX).toBeCloseTo(expectedRasterPosition[0]);
      expect(rasterY).toBeCloseTo(expectedRasterPosition[1]);
    };
  });
  describe('when the raster size is 0 x 0 pixels (unpainted)', () => {
    it('should convert 0,0 (center) in world space to 0,0 in raster space', () => {
      compare([0, 0], [0, 0]);
    });
  });
  describe('when the raster size is 300 x 200 pixels', () => {
    beforeEach(() => {
      const action: CameraAction = { type: 'userSetRasterSize', payload: [300, 200] };
      store.dispatch(action);
    });
    it('should convert 0,0 (center) in world space to 150,100 in raster space', () => {
      compare([0, 0], [150, 100]);
    });
    it('should convert 0,100 (top) in world space to 150,0 in raster space', () => {
      compare([0, 100], [150, 0]);
    });
    it('should convert 150,100 (top right) in world space to 300,0 in raster space', () => {
      compare([150, 100], [300, 0]);
    });
    it('should convert 150,0 (right) in world space to 300,100 in raster space', () => {
      compare([150, 0], [300, 100]);
    });
    it('should convert 150,-100 (right bottom) in world space to 300,200 in raster space', () => {
      compare([150, -100], [300, 200]);
    });
    it('should convert 0,-100 (bottom) in world space to 150,200 in raster space', () => {
      compare([0, -100], [150, 200]);
    });
    it('should convert -150,-100 (bottom left) in world space to 0,200 in raster space', () => {
      compare([-150, -100], [0, 200]);
    });
    it('should convert -150,0 (left) in world space to 0,100 in raster space', () => {
      compare([-150, 0], [0, 100]);
    });
    it('should convert -150,100 (top left) in world space to 0,0 in raster space', () => {
      compare([-150, 100], [0, 0]);
    });
    describe('when the user has zoomed to 0.5', () => {
      beforeEach(() => {
        const action: CameraAction = { type: 'userSetZoomLevel', payload: scaleToZoom(0.5) };
        store.dispatch(action);
      });
      it('should convert 0, 0 (center) in world space to 150, 100 (center)', () => {
        compare([0, 0], [150, 100]);
      });
    });
    describe('when the user has panned to the right and up by 50', () => {
      beforeEach(() => {
        const action: CameraAction = { type: 'userSetPositionOfCamera', payload: [50, 50] };
        store.dispatch(action);
      });
      it('should convert 0,0 (center) in world space to 100,150 in raster space', () => {
        compare([0, 0], [100, 150]);
      });
      it('should convert 50,50 (right and up a bit) in world space to 150,100 (center) in raster space', () => {
        compare([50, 50], [150, 100]);
      });
      it('should convert 60,-60 (right and down a bit) in world space to 160,210 (center) in raster space', () => {
        compare([60, -60], [160, 210]);
      });
    });
    describe('when the user has panned to the right by 350 and up by 250', () => {
      beforeEach(() => {
        const action: CameraAction = {
          type: 'userSetPositionOfCamera',
          payload: [350, 250],
        };
        store.dispatch(action);
      });
      it('should convert 350,250 in world space to 150,100 (center) in raster space', () => {
        compare([350, 250], [150, 100]);
      });
      describe('when the user has scaled to 2', () => {
        // the viewport will only cover half, or 150x100 instead of 300x200
        beforeEach(() => {
          const action: CameraAction = { type: 'userSetZoomLevel', payload: scaleToZoom(2) };
          store.dispatch(action);
        });
        // we expect the viewport to be
        // minX = 350 - (150/2) = 275
        // maxX = 350 + (150/2) = 425
        // minY = 250 - (100/2) = 200
        // maxY = 250 + (100/2) = 300
        it('should convert 350,250 in world space to 150,100 (center) in raster space', () => {
          compare([350, 250], [150, 100]);
        });
        it('should convert 275,300 in world space to 0,0 (top left) in raster space', () => {
          compare([275, 300], [0, 0]);
        });
      });
    });
  });
});
