/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Simulator } from '../test_utilities/simulator';
import { oneAncestorTwoChildren } from '../data_access_layer/mocks/one_ancestor_two_children';
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
    } = oneAncestorTwoChildren();

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
});
