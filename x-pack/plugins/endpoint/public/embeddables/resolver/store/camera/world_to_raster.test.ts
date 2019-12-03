/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Store, createStore } from 'redux';
import { CameraAction, UserSetRasterSize } from './action';
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
  });
});
