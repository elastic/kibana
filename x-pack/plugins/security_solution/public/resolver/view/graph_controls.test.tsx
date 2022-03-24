/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Simulator } from '../test_utilities/simulator';
import { noAncestorsTwoChildren } from '../data_access_layer/mocks/no_ancestors_two_children';
import { nudgeAnimationDuration } from '../store/camera/scaling_constants';
import '../test_utilities/extend_jest';

describe('graph controls: when relsover is loaded with an origin node', () => {
  let simulator: Simulator;
  let originEntityID: string;
  let originNodeStyle: () => AsyncIterable<CSSStyleDeclaration | null>;
  const resolverComponentInstanceID = 'graph-controls-test';

  const originalPositionStyle: Readonly<{ left: string; top: string }> = {
    left: '746.93132px',
    top: '535.5792px',
  };
  const originalSizeStyle: Readonly<{ width: string; height: string }> = {
    width: '360px',
    height: '120px',
  };

  beforeEach(async () => {
    const {
      metadata: { databaseDocumentID, entityIDs },
      dataAccessLayer,
    } = noAncestorsTwoChildren();

    simulator = new Simulator({
      dataAccessLayer,
      databaseDocumentID,
      resolverComponentInstanceID,
      indices: [],
      shouldUpdate: false,
      filters: {},
    });
    originEntityID = entityIDs.origin;

    originNodeStyle = () =>
      simulator.map(() => {
        const wrapper = simulator.processNodeElements({ entityID: originEntityID });
        // `getDOMNode` can only be called on a wrapper of a single node: https://enzymejs.github.io/enzyme/docs/api/ReactWrapper/getDOMNode.html
        if (wrapper.length === 1) {
          return wrapper.getDOMNode<HTMLElement>().style;
        }
        return null;
      });
  });

  it('should display all cardinal panning buttons and the center button', async () => {
    await expect(
      simulator.map(() => ({
        westPanButton: simulator.testSubject('resolver:graph-controls:west-button').length,
        southPanButton: simulator.testSubject('resolver:graph-controls:south-button').length,
        eastPanButton: simulator.testSubject('resolver:graph-controls:east-button').length,
        northPanButton: simulator.testSubject('resolver:graph-controls:north-button').length,
        centerButton: simulator.testSubject('resolver:graph-controls:center-button').length,
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
        zoomInButton: simulator.testSubject('resolver:graph-controls:zoom-in').length,
        zoomOutButton: simulator.testSubject('resolver:graph-controls:zoom-out').length,
        zoomSlider: simulator.testSubject('resolver:graph-controls:zoom-slider').length,
      }))
    ).toYieldEqualTo({
      zoomInButton: 1,
      zoomOutButton: 1,
      zoomSlider: 1,
    });
  });

  it('should display the legend and schema popover buttons', async () => {
    await expect(
      simulator.map(() => ({
        schemaInfoButton: simulator.testSubject('resolver:graph-controls:schema-info-button')
          .length,
        nodeLegendButton: simulator.testSubject('resolver:graph-controls:node-legend-button')
          .length,
      }))
    ).toYieldEqualTo({
      schemaInfoButton: 1,
      nodeLegendButton: 1,
    });
  });

  it("should show the origin node in it's original position", async () => {
    await expect(originNodeStyle()).toYieldObjectEqualTo(originalPositionStyle);
  });

  describe('when the user clicks the west panning button', () => {
    beforeEach(async () => {
      (await simulator.resolve('resolver:graph-controls:west-button'))?.simulate('click');
      simulator.runAnimationFramesTimeFromNow(nudgeAnimationDuration);
    });

    it('should show the origin node further left on the screen', async () => {
      await expect(originNodeStyle()).toYieldObjectEqualTo({
        left: '796.93132px',
        top: '535.5792px',
      });
    });
  });

  describe('when the user clicks the south panning button', () => {
    beforeEach(async () => {
      (await simulator.resolve('resolver:graph-controls:south-button'))?.simulate('click');
      simulator.runAnimationFramesTimeFromNow(nudgeAnimationDuration);
    });

    it('should show the origin node lower on the screen', async () => {
      await expect(originNodeStyle()).toYieldObjectEqualTo({
        left: '746.93132px',
        top: '485.5792px',
      });
    });
  });

  describe('when the user clicks the east panning button', () => {
    beforeEach(async () => {
      (await simulator.resolve('resolver:graph-controls:east-button'))?.simulate('click');
      simulator.runAnimationFramesTimeFromNow(nudgeAnimationDuration);
    });

    it('should show the origin node further right on the screen', async () => {
      await expect(originNodeStyle()).toYieldObjectEqualTo({
        left: '696.93132px',
        top: '535.5792px',
      });
    });
  });

  describe('when the user clicks the north panning button', () => {
    beforeEach(async () => {
      (await simulator.resolve('resolver:graph-controls:north-button'))?.simulate('click');
      simulator.runAnimationFramesTimeFromNow(nudgeAnimationDuration);
    });

    it('should show the origin node higher on the screen', async () => {
      await expect(originNodeStyle()).toYieldObjectEqualTo({
        left: '746.93132px',
        top: '585.5792px',
      });
    });
  });

  describe('when the user clicks the center panning button', () => {
    beforeEach(async () => {
      (await simulator.resolve('resolver:graph-controls:north-button'))?.simulate('click');
      simulator.runAnimationFramesTimeFromNow(nudgeAnimationDuration);
      (await simulator.resolve('resolver:graph-controls:center-button'))?.simulate('click');
      simulator.runAnimationFramesTimeFromNow(nudgeAnimationDuration);
    });

    it("should return the origin node to it's original position", async () => {
      await expect(originNodeStyle()).toYieldObjectEqualTo(originalPositionStyle);
    });
  });

  it('should show the origin node as larger on the screen', async () => {
    await expect(originNodeStyle()).toYieldObjectEqualTo(originalSizeStyle);
  });

  describe('when the zoom in button is clicked', () => {
    beforeEach(async () => {
      (await simulator.resolve('resolver:graph-controls:zoom-in'))?.simulate('click');
      simulator.runAnimationFramesTimeFromNow(nudgeAnimationDuration);
    });

    it('should show the origin node as larger on the screen', async () => {
      await expect(originNodeStyle()).toYieldObjectEqualTo({
        width: '427.7538290724795px',
        height: '142.5846096908265px',
      });
    });
  });

  describe('when the zoom out button is clicked', () => {
    beforeEach(async () => {
      (await simulator.resolve('resolver:graph-controls:zoom-out'))?.simulate('click');
      simulator.runAnimationFramesTimeFromNow(nudgeAnimationDuration);
    });

    it('should show the origin node as smaller on the screen', async () => {
      await expect(originNodeStyle()).toYieldObjectEqualTo({
        width: '303.0461709275204px',
        height: '101.01539030917347px',
      });
    });
  });

  describe('when the slider is moved upwards', () => {
    beforeEach(async () => {
      await expect(originNodeStyle()).toYieldObjectEqualTo(originalSizeStyle);

      (await simulator.resolve('resolver:graph-controls:zoom-slider'))?.simulate('change', {
        target: { value: 0.8 },
      });
      simulator.runAnimationFramesTimeFromNow(nudgeAnimationDuration);
    });

    it('should show the origin node as large on the screen', async () => {
      await expect(originNodeStyle()).toYieldObjectEqualTo({
        width: '525.6000000000001px',
        height: '175.20000000000005px',
      });
    });
  });

  describe('when the slider is moved downwards', () => {
    beforeEach(async () => {
      (await simulator.resolve('resolver:graph-controls:zoom-slider'))?.simulate('change', {
        target: { value: 0.2 },
      });
      simulator.runAnimationFramesTimeFromNow(nudgeAnimationDuration);
    });

    it('should show the origin node as smaller on the screen', async () => {
      await expect(originNodeStyle()).toYieldObjectEqualTo({
        width: '201.60000000000002px',
        height: '67.2px',
      });
    });
  });

  describe('when the schema information button is clicked', () => {
    beforeEach(async () => {
      (await simulator.resolve('resolver:graph-controls:schema-info-button'))?.simulate('click', {
        button: 0,
      });
    });

    it('should show the schema information table with the expected values', async () => {
      await expect(
        simulator.map(() =>
          simulator
            .testSubject('resolver:graph-controls:schema-info:description')
            .map((description) => description.text())
        )
      ).toYieldEqualTo(['endpoint', 'process.entity_id', 'process.parent.entity_id']);
    });
  });

  describe('when the node legend button is clicked', () => {
    beforeEach(async () => {
      (await simulator.resolve('resolver:graph-controls:node-legend-button'))?.simulate('click', {
        button: 0,
      });
    });

    it('should show the node legend table with the expected values', async () => {
      await expect(
        simulator.map(() =>
          simulator
            .testSubject('resolver:graph-controls:node-legend:description')
            .map((description) => description.text())
        )
      ).toYieldEqualTo([
        'Running Process',
        'Terminated Process',
        'Loading Process',
        'Error Process',
      ]);
    });
  });

  describe('when the node legend button is clicked while the schema info button is open', () => {
    beforeEach(async () => {
      (await simulator.resolve('resolver:graph-controls:schema-info-button'))?.simulate('click', {
        button: 0,
      });
    });

    it('should close the schema information table and open the node legend table', async () => {
      expect(simulator.testSubject('resolver:graph-controls:schema-info').length).toBe(1);

      await simulator
        .testSubject('resolver:graph-controls:node-legend-button')
        ?.simulate('click', { button: 0 });

      await expect(
        simulator.map(() => ({
          nodeLegend: simulator.testSubject('resolver:graph-controls:node-legend').length,
          schemaInfo: simulator.testSubject('resolver:graph-controls:schema-info').length,
        }))
      ).toYieldObjectEqualTo({
        nodeLegend: 1,
        schemaInfo: 0,
      });
    });
  });
});
