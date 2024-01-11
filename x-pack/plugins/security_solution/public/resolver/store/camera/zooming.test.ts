/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cameraReducer } from './reducer';
import type { Store, AnyAction, Reducer } from 'redux';
import { createStore } from 'redux';
import type { AnalyzerById, CameraState, AABB } from '../../types';
import { viewableBoundingBox, inverseProjectionMatrix, scalingFactor } from './selectors';
import { expectVectorsToBeClose } from './test_helpers';
import { scaleToZoom } from './scale_to_zoom';
import { applyMatrix3 } from '../../models/vector2';
import { EMPTY_RESOLVER } from '../helpers';
import {
  userSetZoomLevel,
  userClickedZoomOut,
  userClickedZoomIn,
  userZoomed,
  userSetPositionOfCamera,
  userSetRasterSize,
  userMovedPointer,
} from './action';

describe('zooming', () => {
  let store: Store<AnalyzerById, AnyAction>;
  let time: number;
  const id = 'test-id';

  const cameraShouldBeBoundBy = (expectedViewableBoundingBox: AABB): [string, () => void] => {
    return [
      `the camera view should be bound by an AABB with a minimum point of ${expectedViewableBoundingBox.minimum} and a maximum point of ${expectedViewableBoundingBox.maximum}`,
      () => {
        const actual = viewableBoundingBox(store.getState()[id].camera)(time);
        expect(actual.minimum[0]).toBeCloseTo(expectedViewableBoundingBox.minimum[0]);
        expect(actual.minimum[1]).toBeCloseTo(expectedViewableBoundingBox.minimum[1]);
        expect(actual.maximum[0]).toBeCloseTo(expectedViewableBoundingBox.maximum[0]);
        expect(actual.maximum[1]).toBeCloseTo(expectedViewableBoundingBox.maximum[1]);
      },
    ];
  };
  beforeEach(() => {
    // Time isn't relevant as we aren't testing animation
    time = 0;
    const testReducer: Reducer<AnalyzerById, AnyAction> = (
      state = {
        [id]: EMPTY_RESOLVER,
      },
      action
    ): AnalyzerById => cameraReducer(state, action);
    store = createStore(testReducer, undefined);
  });
  describe('when the raster size is 300 x 200 pixels', () => {
    beforeEach(() => {
      store.dispatch(userSetRasterSize({ id, dimensions: [300, 200] }));
    });
    it(
      ...cameraShouldBeBoundBy({
        minimum: [-150, -100],
        maximum: [150, 100],
      })
    );
    describe('when the user has scaled in to 2x', () => {
      beforeEach(() => {
        store.dispatch(userSetZoomLevel({ id, zoomLevel: scaleToZoom(2) }));
      });
      it(
        ...cameraShouldBeBoundBy({
          minimum: [-75, -50],
          maximum: [75, 50],
        })
      );
    });
    describe('when the user zooms in all the way', () => {
      beforeEach(() => {
        store.dispatch(userZoomed({ id, zoomChange: 1, time }));
      });
      it('should zoom to maximum scale factor', () => {
        const actual = viewableBoundingBox(store.getState()[id].camera)(time);
        expect(actual).toMatchInlineSnapshot(`
          Object {
            "maximum": Array [
              75,
              50,
            ],
            "minimum": Array [
              -75,
              -50,
            ],
          }
        `);
      });
    });
    it('the raster position 200, 50 should map to the world position 50, 50', () => {
      expectVectorsToBeClose(
        applyMatrix3([200, 50], inverseProjectionMatrix(store.getState()[id].camera)(time)),
        [50, 50]
      );
    });
    describe('when the user has moved their mouse to the raster position 200, 50', () => {
      beforeEach(() => {
        store.dispatch(userMovedPointer({ id, screenCoordinates: [200, 50], time }));
      });
      it('should have focused the world position 50, 50', () => {
        const coords = store.getState()[id].camera.latestFocusedWorldCoordinates;
        if (coords !== null) {
          expectVectorsToBeClose(coords, [50, 50]);
        } else {
          throw new Error('coords should not have been null');
        }
      });
      describe('when the user zooms in by 0.5 zoom units', () => {
        beforeEach(() => {
          store.dispatch(userZoomed({ id, zoomChange: 0.5, time }));
        });
        it('the raster position 200, 50 should map to the world position 50, 50', () => {
          expectVectorsToBeClose(
            applyMatrix3([200, 50], inverseProjectionMatrix(store.getState()[id].camera)(time)),
            [50, 50]
          );
        });
      });
    });
    describe('when the user pans right by 100 pixels', () => {
      beforeEach(() => {
        store.dispatch(userSetPositionOfCamera({ id, cameraView: [100, 0] }));
      });
      it(
        ...cameraShouldBeBoundBy({
          minimum: [-50, -100],
          maximum: [250, 100],
        })
      );
      it('should be centered on 100, 0', () => {
        const worldCenterPoint = applyMatrix3(
          [150, 100],
          inverseProjectionMatrix(store.getState()[id].camera)(time)
        );
        expect(worldCenterPoint[0]).toBeCloseTo(100);
        expect(worldCenterPoint[1]).toBeCloseTo(0);
      });
      describe('when the user scales to 2x', () => {
        beforeEach(() => {
          store.dispatch(userSetZoomLevel({ id, zoomLevel: scaleToZoom(2) }));
        });
        it('should be centered on 100, 0', () => {
          const worldCenterPoint = applyMatrix3(
            [150, 100],
            inverseProjectionMatrix(store.getState()[id].camera)(time)
          );
          expect(worldCenterPoint[0]).toBeCloseTo(100);
          expect(worldCenterPoint[1]).toBeCloseTo(0);
        });
      });
    });
  });
  describe('zoom controls', () => {
    let previousScalingFactor: CameraState['scalingFactor'];
    describe('when user clicks on zoom in button', () => {
      beforeEach(() => {
        previousScalingFactor = scalingFactor(store.getState()[id].camera);
        store.dispatch(userClickedZoomIn({ id }));
      });
      it('the scaling factor should increase by 0.1 units', () => {
        const actual = scalingFactor(store.getState()[id].camera);
        expect(actual).toEqual(previousScalingFactor + 0.1);
      });
    });
    describe('when user clicks on zoom out button', () => {
      beforeEach(() => {
        previousScalingFactor = scalingFactor(store.getState()[id].camera);
        store.dispatch(userClickedZoomOut({ id }));
      });
      it('the scaling factor should decrease by 0.1 units', () => {
        const actual = scalingFactor(store.getState()[id].camera);
        expect(actual).toEqual(previousScalingFactor - 0.1);
      });
    });
  });
});
