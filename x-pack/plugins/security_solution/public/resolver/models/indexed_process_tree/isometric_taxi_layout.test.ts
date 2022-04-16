/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ResolverNode } from '../../../../common/endpoint/types';
import { isometricTaxiLayoutFactory } from './isometric_taxi_layout';
import { factory } from '.';
import { EndpointDocGenerator } from '../../../../common/endpoint/generate_data';
import { genResolverNode } from '../../mocks/generator';
import { IsometricTaxiLayout } from '../../types';

function layout(events: ResolverNode[]) {
  return isometricTaxiLayoutFactory(factory(events, 'A'));
}

describe('resolver graph layout', () => {
  let processA: ResolverNode;
  let processB: ResolverNode;
  let processC: ResolverNode;
  let processD: ResolverNode;
  let processE: ResolverNode;
  let processF: ResolverNode;
  let processG: ResolverNode;
  let processH: ResolverNode;
  let processI: ResolverNode;

  const gen = new EndpointDocGenerator('resolver');

  beforeEach(() => {
    /*
     *          A
     *      ____|____
     *     |         |
     *     B         C
     *  ___|___   ___|___
     * |       | |       |
     * D       E F       G
     *                   |
     *                   H
     *
     */
    const timestamp = 1606234833273;
    processA = genResolverNode(gen, { entityID: 'A', eventType: ['start'], timestamp });
    processB = genResolverNode(gen, {
      entityID: 'B',
      parentEntityID: 'A',
      eventType: ['info'],
      timestamp,
    });
    processC = genResolverNode(gen, {
      entityID: 'C',
      parentEntityID: 'A',
      eventType: ['start'],
      timestamp,
    });
    processD = genResolverNode(gen, {
      entityID: 'D',
      parentEntityID: 'B',
      eventType: ['start'],
      timestamp,
    });
    processE = genResolverNode(gen, {
      entityID: 'E',
      parentEntityID: 'B',
      eventType: ['start'],
      timestamp,
    });
    processF = genResolverNode(gen, {
      timestamp,
      entityID: 'F',
      parentEntityID: 'C',
      eventType: ['start'],
    });
    processG = genResolverNode(gen, {
      timestamp,
      entityID: 'G',
      parentEntityID: 'C',
      eventType: ['start'],
    });
    processH = genResolverNode(gen, {
      timestamp,
      entityID: 'H',
      parentEntityID: 'G',
      eventType: ['start'],
    });
    processI = genResolverNode(gen, {
      timestamp,
      entityID: 'I',
      parentEntityID: 'A',
      eventType: ['end'],
    });
  });
  describe('when rendering no nodes', () => {
    it('renders right', () => {
      expect(layout([])).toMatchSnapshot();
    });
  });
  describe('when rendering one node', () => {
    it('renders right', () => {
      expect(layout([processA])).toMatchSnapshot();
    });
  });
  describe('when rendering two nodes, one being the parent of the other', () => {
    it('renders right', () => {
      expect(layout([processA, processB])).toMatchSnapshot();
    });
  });
  describe('when rendering two forks, and one fork has an extra long tine', () => {
    let layoutResponse: IsometricTaxiLayout;
    beforeEach(() => {
      layoutResponse = layout([
        processA,
        processB,
        processC,
        processD,
        processE,
        processF,
        processG,
        processH,
        processI,
      ]);
    });
    it('renders right', () => {
      expect(layoutResponse).toMatchSnapshot();
    });
    it('should have node a at level 1', () => {
      expect(layoutResponse.ariaLevels.get(processA)).toBe(1);
    });
    it('should have nodes b and c at level 2', () => {
      expect(layoutResponse.ariaLevels.get(processB)).toBe(2);
      expect(layoutResponse.ariaLevels.get(processC)).toBe(2);
    });
    it('should have nodes d, e, f, and g at level 3', () => {
      expect(layoutResponse.ariaLevels.get(processD)).toBe(3);
      expect(layoutResponse.ariaLevels.get(processE)).toBe(3);
      expect(layoutResponse.ariaLevels.get(processF)).toBe(3);
      expect(layoutResponse.ariaLevels.get(processG)).toBe(3);
    });
    it('should have node h at level 4', () => {
      expect(layoutResponse.ariaLevels.get(processH)).toBe(4);
    });
    it('should have 9 items in the map of aria levels', () => {
      expect(layoutResponse.ariaLevels.size).toBe(9);
    });
  });
});
