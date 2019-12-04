/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CameraAction } from './action';
import { cameraReducer } from './reducer';
import { createStore, Store } from 'redux';
import { CameraState, AABB } from '../../types';
import { viewableBoundingBox, rasterToWorld } from './selectors';
import { userScaled } from './test_helpers';

describe('zooming', () => {
  let store: Store<CameraState, CameraAction>;

  const cameraShouldBeBoundBy = (expectedViewableBoundingBox: AABB): [string, () => void] => {
    return [
      `the camera view should be bound by an AABB with a minimum point of ${expectedViewableBoundingBox.minimum} and a maximum point of ${expectedViewableBoundingBox.maximum}`,
      () => {
        const actual = viewableBoundingBox(store.getState());
        expect(actual.minimum[0]).toBeCloseTo(expectedViewableBoundingBox.minimum[0]);
        expect(actual.minimum[1]).toBeCloseTo(expectedViewableBoundingBox.minimum[1]);
        expect(actual.maximum[0]).toBeCloseTo(expectedViewableBoundingBox.maximum[0]);
        expect(actual.maximum[1]).toBeCloseTo(expectedViewableBoundingBox.maximum[1]);
      },
    ];
  };
  beforeEach(() => {
    store = createStore(cameraReducer, undefined);
  });
  describe('when the raster size is 300 x 200 pixels', () => {
    beforeEach(() => {
      const action: CameraAction = { type: 'userSetRasterSize', payload: [300, 200] };
      store.dispatch(action);
    });
    it(
      ...cameraShouldBeBoundBy({
        minimum: [-150, -100],
        maximum: [150, 100],
      })
    );
    describe('when the user has zoomed in to 2x', () => {
      beforeEach(() => {
        userScaled(store, [2, 2]);
      });
      it(
        ...cameraShouldBeBoundBy({
          minimum: [-75, -50],
          maximum: [75, 50],
        })
      );
    });
    describe('when the user pans right by 100 pixels', () => {
      beforeEach(() => {
        const action: CameraAction = { type: 'userSetPanningOffset', payload: [-100, 0] };
        store.dispatch(action);
      });
      it(
        ...cameraShouldBeBoundBy({
          minimum: [-50, -100],
          maximum: [250, 100],
        })
      );
      it('should be centered on 100, 0', () => {
        const worldCenterPoint = rasterToWorld(store.getState())([150, 100]);
        expect(worldCenterPoint[0]).toBeCloseTo(100);
        expect(worldCenterPoint[1]).toBeCloseTo(0);
      });
      describe('when the user zooms to 2x', () => {
        beforeEach(() => {
          userScaled(store, [2, 2]);
        });
        it('should be centered on 100, 0', () => {
          const worldCenterPoint = rasterToWorld(store.getState())([150, 100]);
          expect(worldCenterPoint[0]).toBeCloseTo(100);
          expect(worldCenterPoint[1]).toBeCloseTo(0);
        });
      });
    });
  });
});
