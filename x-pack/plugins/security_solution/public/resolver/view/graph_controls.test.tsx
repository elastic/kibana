/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Simulator } from '../test_utilities/simulator';
import { noAncestorsTwoChildren } from '../data_access_layer/mocks/no_ancestors_two_children';
import { nudgeAnimationDuration } from '../store/camera/scaling_constants';
import '../test_utilities/extend_jest';
import { ReactWrapper } from 'enzyme';

describe('graph controls', () => {
  let simulator: Simulator;
  let originEntityID: string;
  let originNode: ReactWrapper;
  const resolverComponentInstanceID = 'graph-controls-test';

  beforeEach(async () => {
    const {
      metadata: { databaseDocumentID, entityIDs },
      dataAccessLayer,
    } = noAncestorsTwoChildren();

    simulator = new Simulator({
      dataAccessLayer,
      databaseDocumentID,
      resolverComponentInstanceID,
    });
    originEntityID = entityIDs.origin;
  });

  describe('when the graph controls load', () => {
    it('should display all cardinal panning buttons and the center button', async () => {
      await expect(
        simulator.map(() => ({
          westPanButton: simulator.westPanElement().length,
          southPanButton: simulator.southPanElement().length,
          eastPanButton: simulator.eastPanElement().length,
          northPanButton: simulator.northPanElement().length,
          centerButton: simulator.centerPanElement().length,
        }))
      ).toYieldEqualTo({
        westPanButton: 1,
        southPanButton: 1,
        eastPanButton: 1,
        northPanButton: 1,
        centerButton: 1,
      });
    });

    it('should display the zoom buttons and slider', async () => {
      await expect(
        simulator.map(() => ({
          zoomInButton: simulator.zoomInElement().length,
          zoomOutButton: simulator.zoomOutElement().length,
          zoomSlider: simulator.zoomSliderElement().length,
        }))
      ).toYieldEqualTo({
        zoomInButton: 1,
        zoomOutButton: 1,
        zoomSlider: 1,
      });
    });
  });

  describe('panning', () => {
    const originalPositionStyle = { left: '746.93132px', top: '535.5792px' };
    beforeEach(() => {
      originNode = simulator.processNodeElements({ entityID: originEntityID });
    });

    describe('when the user has not interacted with panning yet', () => {
      it("should show the origin node in it's original position", () => {
        expect(originNode.getDOMNode()).toHaveStyle(originalPositionStyle);
      });
    });

    describe('when the user clicks the west panning button', () => {
      beforeEach(() => {
        simulator.westPanElement().simulate('click');
        simulator.runAnimationFramesTimeFromNow(nudgeAnimationDuration);
      });

      it('should show the origin node further left on the screen', async () => {
        expect(originNode.getDOMNode()).toHaveStyle({ left: '796.93132px', top: '535.5792px' });
      });
    });

    describe('when the user clicks the south panning button', () => {
      beforeEach(() => {
        simulator.southPanElement().simulate('click');
        simulator.runAnimationFramesTimeFromNow(nudgeAnimationDuration);
      });

      it('should show the origin node lower on the screen', async () => {
        expect(originNode.getDOMNode()).toHaveStyle({ left: '746.93132px', top: '485.5792px' });
      });
    });

    describe('when the user clicks the east panning button', () => {
      beforeEach(() => {
        simulator.eastPanElement().simulate('click');
        simulator.runAnimationFramesTimeFromNow(nudgeAnimationDuration);
      });

      it('should show the origin node further right on the screen', async () => {
        expect(originNode.getDOMNode()).toHaveStyle({ left: '696.93132px', top: '535.5792px' });
      });
    });

    describe('when the user clicks the north panning button', () => {
      beforeEach(() => {
        simulator.northPanElement().simulate('click');
        simulator.runAnimationFramesTimeFromNow(nudgeAnimationDuration);
      });

      it('should show the origin node higher on the screen', async () => {
        expect(originNode.getDOMNode()).toHaveStyle({ left: '746.93132px', top: '585.5792px' });
      });
    });

    describe('when the user clicks the center panning button', () => {
      beforeEach(() => {
        simulator.northPanElement().simulate('click');
        simulator.runAnimationFramesTimeFromNow(nudgeAnimationDuration);
        simulator.centerPanElement().simulate('click');
        simulator.runAnimationFramesTimeFromNow(nudgeAnimationDuration);
      });

      it("should return the origin node to it's original position", async () => {
        expect(originNode.getDOMNode()).toHaveStyle(originalPositionStyle);
      });
    });
  });

  describe('zooming', () => {
    const originalSizeStyle = { width: '360px', height: '120px' };
    beforeEach(() => {
      originNode = simulator.processNodeElements({ entityID: originEntityID });
    });

    describe('when the user has not interacted with the zoom buttons or slider yet', () => {
      it('should show the origin node as larger on the screen', () => {
        expect(originNode.getDOMNode()).toHaveStyle(originalSizeStyle);
      });
    });

    describe('when the zoom in button is clicked', () => {
      beforeEach(() => {
        simulator.zoomInElement().simulate('click');
        simulator.runAnimationFramesTimeFromNow(nudgeAnimationDuration);
      });

      it('should show the origin node as larger on the screen', () => {
        expect(originNode.getDOMNode()).toHaveStyle({
          width: '427.7538290724795px',
          height: '142.5846096908265px',
        });
      });
    });

    describe('when the zoom out button is clicked', () => {
      beforeEach(() => {
        simulator.zoomOutElement().simulate('click');
        simulator.runAnimationFramesTimeFromNow(nudgeAnimationDuration);
      });

      it('should show the origin node as smaller on the screen', () => {
        expect(originNode.getDOMNode()).toHaveStyle({
          width: '303.0461709275204px',
          height: '101.01539030917347px',
        });
      });
    });

    describe('when the slider is moved upwards', () => {
      beforeEach(() => {
        expect(originNode.getDOMNode()).toHaveStyle(originalSizeStyle);

        simulator.zoomSliderElement().simulate('change', { target: { value: 0.8 } });
        simulator.runAnimationFramesTimeFromNow(nudgeAnimationDuration);
      });

      it('should show the origin node as large on the screen', () => {
        expect(originNode.getDOMNode()).toHaveStyle({
          width: '525.6000000000001px',
          height: '175.20000000000005px',
        });
      });
    });

    describe('when the slider is moved downwards', () => {
      beforeEach(() => {
        simulator.zoomSliderElement().simulate('change', { target: { value: 0.2 } });
        simulator.runAnimationFramesTimeFromNow(nudgeAnimationDuration);
      });

      it('should show the origin node as smaller on the screen', () => {
        expect(originNode.getDOMNode()).toHaveStyle({
          width: '201.60000000000002px',
          height: '67.2px',
        });
      });
    });
  });
});
