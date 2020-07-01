/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CameraAction } from './action';
import { cameraReducer } from './reducer';
import { createStore, Store } from 'redux';
import { CameraState, AABB } from '../../types';
import { viewableBoundingBox, inverseProjectionMatrix, scalingFactor } from './selectors';
import { expectVectorsToBeClose } from './test_helpers';
import { scaleToZoom } from './scale_to_zoom';
import { applyMatrix3 } from '../../models/vector2';

describe('zooming', () => {
  let store: Store<CameraState, CameraAction>;
  let time: number;

  const cameraShouldBeBoundBy = (expectedViewableBoundingBox: AABB): [string, () => void] => {
    return [
      `the camera view should be bound by an AABB with a minimum point of ${expectedViewableBoundingBox.minimum} and a maximum point of ${expectedViewableBoundingBox.maximum}`,
      () => {
        const actual = viewableBoundingBox(store.getState())(time);
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
    describe('when the user has scaled in to 2x', () => {
      beforeEach(() => {
        const action: CameraAction = { type: 'userSetZoomLevel', payload: scaleToZoom(2) };
        store.dispatch(action);
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
        const action: CameraAction = {
          type: 'userZoomed',
          payload: { zoomChange: 1, time },
        };
        store.dispatch(action);
      });
      it('should zoom to maximum scale factor', () => {
        const actual = viewableBoundingBox(store.getState())(time);
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
        applyMatrix3([200, 50], inverseProjectionMatrix(store.getState())(time)),
        [50, 50]
      );
    });
    describe('when the user has moved their mouse to the raster position 200, 50', () => {
      beforeEach(() => {
        const action: CameraAction = {
          type: 'userMovedPointer',
          payload: { screenCoordinates: [200, 50], time },
        };
        store.dispatch(action);
      });
      it('should have focused the world position 50, 50', () => {
        const coords = store.getState().latestFocusedWorldCoordinates;
        if (coords !== null) {
          expectVectorsToBeClose(coords, [50, 50]);
        } else {
          throw new Error('coords should not have been null');
        }
      });
      describe('when the user zooms in by 0.5 zoom units', () => {
        beforeEach(() => {
          const action: CameraAction = {
            type: 'userZoomed',
            payload: { zoomChange: 0.5, time },
          };
          store.dispatch(action);
        });
        it('the raster position 200, 50 should map to the world position 50, 50', () => {
          expectVectorsToBeClose(
            applyMatrix3([200, 50], inverseProjectionMatrix(store.getState())(time)),
            [50, 50]
          );
        });
      });
    });
    describe('when the user pans right by 100 pixels', () => {
      beforeEach(() => {
        const action: CameraAction = { type: 'userSetPositionOfCamera', payload: [100, 0] };
        store.dispatch(action);
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
          inverseProjectionMatrix(store.getState())(time)
        );
        expect(worldCenterPoint[0]).toBeCloseTo(100);
        expect(worldCenterPoint[1]).toBeCloseTo(0);
      });
      describe('when the user scales to 2x', () => {
        beforeEach(() => {
          const action: CameraAction = { type: 'userSetZoomLevel', payload: scaleToZoom(2) };
          store.dispatch(action);
        });
        it('should be centered on 100, 0', () => {
          const worldCenterPoint = applyMatrix3(
            [150, 100],
            inverseProjectionMatrix(store.getState())(time)
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
        previousScalingFactor = scalingFactor(store.getState());
        const action: CameraAction = { type: 'userClickedZoomIn' };
        store.dispatch(action);
      });
      it('the scaling factor should increase by 0.1 units', () => {
        const actual = scalingFactor(store.getState());
        expect(actual).toEqual(previousScalingFactor + 0.1);
      });
    });
    describe('when user clicks on zoom out button', () => {
      beforeEach(() => {
        previousScalingFactor = scalingFactor(store.getState());
        const action: CameraAction = { type: 'userClickedZoomOut' };
        store.dispatch(action);
      });
      it('the scaling factor should decrease by 0.1 units', () => {
        const actual = scalingFactor(store.getState());
        expect(actual).toEqual(previousScalingFactor - 0.1);
      });
    });
  });
});
