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
    it('should display all cardinal panning buttons and the center button', () => {
      const westPanButton = simulator
        .graphControlElement()
        .find('[data-test-subj="resolver:graph-controls:west-button"]');
      const southPanButton = simulator
        .graphControlElement()
        .find('[data-test-subj="resolver:graph-controls:west-button"]');
      const eastPanButton = simulator
        .graphControlElement()
        .find('[data-test-subj="resolver:graph-controls:west-button"]');
      const northPanButton = simulator
        .graphControlElement()
        .find('[data-test-subj="resolver:graph-controls:west-button"]');
      const centerButton = simulator
        .graphControlElement()
        .find('[data-test-subj="resolver:graph-controls:center-button"]');

      expect(westPanButton.length).toBe(1);
      expect(southPanButton.length).toBe(1);
      expect(eastPanButton.length).toBe(1);
      expect(northPanButton.length).toBe(1);
      expect(centerButton.length).toBe(1);
    });

    it('should display the zoom buttons and slider', () => {
      const zoomInButton = simulator
        .graphControlElement()
        .find('[data-test-subj="resolver:graph-controls:zoom-in"]');
      const zoomOutButton = simulator
        .graphControlElement()
        .find('[data-test-subj="resolver:graph-controls:zoom-out"]');
      const zoomSlider = simulator
        .graphControlElement()
        .find('[data-test-subj="resolver:graph-controls:zoom-slider"]');

      expect(zoomInButton.length).toBe(1);
      expect(zoomOutButton.length).toBe(1);
      // Zoom slider is an EUI component that enzyme renders as EUIRangeTrack, EUIRangeSlider, input element
      expect(zoomSlider.length).toBeGreaterThan(0);
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
      let westPanButton: ReactWrapper;
      beforeEach(() => {
        westPanButton = simulator
          .graphControlElement()
          .find('[data-test-subj="resolver:graph-controls:west-button"]');
        westPanButton.simulate('click');
        simulator.runAnimationFramesTimeFromNow(nudgeAnimationDuration);
      });

      it('should show the origin node further left on the screen', async () => {
        expect(originNode.getDOMNode()).toHaveStyle({ left: '796.93132px', top: '535.5792px' });
      });
    });

    describe('when the user clicks the south panning button', () => {
      let southPanButton: ReactWrapper;
      beforeEach(() => {
        southPanButton = simulator
          .graphControlElement()
          .find('[data-test-subj="resolver:graph-controls:south-button"]');
        southPanButton.simulate('click');
        simulator.runAnimationFramesTimeFromNow(nudgeAnimationDuration);
      });

      it('should show the origin node lower on the screen', async () => {
        expect(originNode.getDOMNode()).toHaveStyle({ left: '746.93132px', top: '485.5792px' });
      });
    });

    describe('when the user clicks the east panning button', () => {
      let eastPanButton: ReactWrapper;
      beforeEach(() => {
        eastPanButton = simulator
          .graphControlElement()
          .find('[data-test-subj="resolver:graph-controls:east-button"]');
        eastPanButton.simulate('click');
        simulator.runAnimationFramesTimeFromNow(nudgeAnimationDuration);
      });

      it('should show the origin node further right on the screen', async () => {
        expect(originNode.getDOMNode()).toHaveStyle({ left: '696.93132px', top: '535.5792px' });
      });
    });

    describe('when the user clicks the north panning button', () => {
      let northPanButton: ReactWrapper;
      beforeEach(() => {
        northPanButton = simulator
          .graphControlElement()
          .find('[data-test-subj="resolver:graph-controls:north-button"]');
        northPanButton.simulate('click');
        simulator.runAnimationFramesTimeFromNow(nudgeAnimationDuration);
      });

      it('should show the origin node higher on the screen', async () => {
        expect(originNode.getDOMNode()).toHaveStyle({ left: '746.93132px', top: '585.5792px' });
      });
    });

    describe('when the user clicks the center panning button', () => {
      let northPanButton: ReactWrapper;
      let centerButton: ReactWrapper;
      beforeEach(() => {
        northPanButton = simulator
          .graphControlElement()
          .find('[data-test-subj="resolver:graph-controls:north-button"]');
        centerButton = simulator
          .graphControlElement()
          .find('[data-test-subj="resolver:graph-controls:center-button"]');

        northPanButton.simulate('click');
        simulator.runAnimationFramesTimeFromNow(nudgeAnimationDuration);
        centerButton.simulate('click');
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
        const zoomInButton = simulator
          .graphControlElement()
          .find('[data-test-subj="resolver:graph-controls:zoom-in"]');
        zoomInButton.simulate('click');
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
        const zoomOutButton = simulator
          .graphControlElement()
          .find('[data-test-subj="resolver:graph-controls:zoom-out"]');
        zoomOutButton.simulate('click');
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

        const zoomSlider = simulator
          .graphControlElement()
          .find('[data-test-subj="resolver:graph-controls:zoom-slider"]')
          .last();
        zoomSlider.simulate('change', { target: { value: 0.8 } });
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
        const zoomSlider = simulator
          .graphControlElement()
          .find('[data-test-subj="resolver:graph-controls:zoom-slider"]')
          .last(); // The last element rendered is the actual slider input element
        zoomSlider.simulate('change', { target: { value: 0.2 } });
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
