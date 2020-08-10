/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Simulator } from '../test_utilities/simulator';
import { noAncestorsTwoChildren } from '../data_access_layer/mocks/no_ancestors_two_children';
import { nudgeAnimationDuration } from '../store/camera/scaling_constants';
import '../test_utilities/extend_jest';

describe('graph controls', () => {
  let simulator: Simulator;
  let originEntityID: string;
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

  it('should load graph controls', () => {
    expect(simulator.graphControlElement().length).toBe(1);
  });

  describe('panning', () => {
    const originalPositionStyle = { left: '746.93132px', top: '535.5792px' };
    it('should pan west', async () => {
      const originNode = simulator.processNodeElements({ entityID: originEntityID });
      expect(originNode.getDOMNode()).toHaveStyle(originalPositionStyle);

      const westPanButton = simulator.graphControlElement().find('[data-test-subj="west-button"]');
      westPanButton.simulate('click');
      simulator.runAnimationFramesTimeFromNow(nudgeAnimationDuration);

      expect(originNode.getDOMNode()).toHaveStyle({ left: '796.93132px', top: '535.5792px' });
    });

    it('should pan south', async () => {
      const originNode = simulator.processNodeElements({ entityID: originEntityID });
      expect(originNode.getDOMNode()).toHaveStyle(originalPositionStyle);

      const southPanButton = simulator
        .graphControlElement()
        .find('[data-test-subj="south-button"]');
      southPanButton.simulate('click');
      simulator.runAnimationFramesTimeFromNow(nudgeAnimationDuration);

      expect(originNode.getDOMNode()).toHaveStyle({ left: '746.93132px', top: '485.5792px' });
    });

    it('should pan east', async () => {
      const originNode = simulator.processNodeElements({ entityID: originEntityID });
      expect(originNode.getDOMNode()).toHaveStyle(originalPositionStyle);

      const eastPanButton = simulator.graphControlElement().find('[data-test-subj="east-button"]');
      eastPanButton.simulate('click');
      simulator.runAnimationFramesTimeFromNow(nudgeAnimationDuration);

      expect(originNode.getDOMNode()).toHaveStyle({ left: '696.93132px', top: '535.5792px' });
    });

    it('should pan north', async () => {
      const originNode = simulator.processNodeElements({ entityID: originEntityID });
      expect(originNode.getDOMNode()).toHaveStyle(originalPositionStyle);

      const northButton = simulator.graphControlElement().find('[data-test-subj="north-button"]');
      northButton.simulate('click');
      simulator.runAnimationFramesTimeFromNow(nudgeAnimationDuration);

      expect(originNode.getDOMNode()).toHaveStyle({ left: '746.93132px', top: '585.5792px' });
    });

    it('should recenter', async () => {
      const originNode = simulator.processNodeElements({ entityID: originEntityID });
      const northButton = simulator.graphControlElement().find('[data-test-subj="north-button"]');
      const centerButton = simulator.graphControlElement().find('[data-test-subj="center-button"]');

      expect(originNode.getDOMNode()).toHaveStyle(originalPositionStyle);

      northButton.simulate('click');
      simulator.runAnimationFramesTimeFromNow(nudgeAnimationDuration);

      expect(originNode.getDOMNode()).toHaveStyle({ left: '746.93132px', top: '585.5792px' });

      centerButton.simulate('click');
      simulator.runAnimationFramesTimeFromNow(nudgeAnimationDuration);

      expect(originNode.getDOMNode()).toHaveStyle(originalPositionStyle);
    });
  });

  describe('zoom', () => {
    const originalSizeStyle = { width: '360px', height: '120px' };
    describe('buttons', () => {
      it('should zoom in', () => {
        const originNode = simulator.processNodeElements({ entityID: originEntityID });
        expect(originNode.getDOMNode()).toHaveStyle(originalSizeStyle);

        const zoomInButton = simulator.graphControlElement().find('[data-test-subj="zoom-in"]');
        zoomInButton.simulate('click');
        simulator.runAnimationFramesTimeFromNow(nudgeAnimationDuration);

        expect(originNode.getDOMNode()).toHaveStyle({
          width: '427.7538290724795px',
          height: '142.5846096908265px',
        });
      });
      it('should zoom out', () => {
        const originNode = simulator.processNodeElements({ entityID: originEntityID });
        expect(originNode.getDOMNode()).toHaveStyle(originalSizeStyle);

        const zoomInButton = simulator.graphControlElement().find('[data-test-subj="zoom-out"]');
        zoomInButton.simulate('click');
        simulator.runAnimationFramesTimeFromNow(nudgeAnimationDuration);

        expect(originNode.getDOMNode()).toHaveStyle({
          width: '303.0461709275204px',
          height: '101.01539030917347px',
        });
      });
    });

    describe('slider', () => {
      it('should zoom in', () => {
        const originNode = simulator.processNodeElements({ entityID: originEntityID });
        expect(originNode.getDOMNode()).toHaveStyle(originalSizeStyle);

        const zoomSlider = simulator
          .graphControlElement()
          .find('[data-test-subj="zoom-slider"]')
          .last();
        zoomSlider.simulate('change', { target: { value: 0.8 } });
        simulator.runAnimationFramesTimeFromNow(nudgeAnimationDuration);

        expect(originNode.getDOMNode()).toHaveStyle({
          width: '525.6000000000001px',
          height: '175.20000000000005px',
        });
      });
      it('should zoom out', () => {
        const originNode = simulator.processNodeElements({ entityID: originEntityID });
        expect(originNode.getDOMNode()).toHaveStyle(originalSizeStyle);

        const zoomSlider = simulator
          .graphControlElement()
          .find('[data-test-subj="zoom-slider"]')
          .last();
        zoomSlider.simulate('change', { target: { value: 0.2 } });
        simulator.runAnimationFramesTimeFromNow(nudgeAnimationDuration);

        expect(originNode.getDOMNode()).toHaveStyle({
          width: '201.60000000000002px',
          height: '67.2px',
        });
      });
    });
  });
});
