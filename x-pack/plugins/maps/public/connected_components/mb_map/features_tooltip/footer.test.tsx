/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { Footer } from './footer';
import { ILayer } from '../../../classes/layers/layer';

const defaultProps = {
  isLocked: false,
  findLayerById: (id: string) => {
    return ({
      async getDisplayName() {
        return `display + ${id}`;
      },
      getId() {
        return id;
      },
    } as unknown) as ILayer;
  },
  setCurrentFeature: () => {},
};

describe('Footer', () => {
  describe('single feature:', () => {
    const SINGLE_FEATURE = [
      {
        id: 'feature1',
        layerId: 'layer1',
        mbProperties: {},
      },
    ];
    describe('mouseover (unlocked)', () => {
      test('should not render header', async () => {
        const component = shallow(<Footer {...defaultProps} features={SINGLE_FEATURE} />);

        // Ensure all promises resolve
        await new Promise((resolve) => process.nextTick(resolve));
        // Ensure the state changes are reflected
        component.update();

        expect(component).toMatchSnapshot();
      });
    });
  });

  describe('multiple features, single layer:', () => {
    const MULTI_FEATURES_SINGE_LAYER = [
      {
        id: 'feature1',
        layerId: 'layer1',
        mbProperties: {},
      },
      {
        id: 'feature2',
        layerId: 'layer1',
        mbProperties: {},
      },
    ];
    describe('mouseover (unlocked)', () => {
      test('should only show features count', async () => {
        const component = shallow(
          <Footer {...defaultProps} features={MULTI_FEATURES_SINGE_LAYER} />
        );

        // Ensure all promises resolve
        await new Promise((resolve) => process.nextTick(resolve));
        // Ensure the state changes are reflected
        component.update();

        expect(component).toMatchSnapshot();
      });
    });
    describe('locked', () => {
      test('should show pagination controls and features count', async () => {
        const component = shallow(
          <Footer {...defaultProps} isLocked={true} features={MULTI_FEATURES_SINGE_LAYER} />
        );

        // Ensure all promises resolve
        await new Promise((resolve) => process.nextTick(resolve));
        // Ensure the state changes are reflected
        component.update();

        expect(component).toMatchSnapshot();
      });
    });
  });

  describe('multiple features, multiple layers:', () => {
    const MULTI_FEATURES_MULTI_LAYERS = [
      {
        id: 'feature1',
        layerId: 'layer1',
        mbProperties: {},
      },
      {
        id: 'feature2',
        layerId: 'layer1',
        mbProperties: {},
      },
      {
        id: 'feature1',
        layerId: 'layer2',
        mbProperties: {},
      },
    ];
    describe('mouseover (unlocked)', () => {
      test('should only show features count', async () => {
        const component = shallow(
          <Footer {...defaultProps} features={MULTI_FEATURES_MULTI_LAYERS} />
        );

        // Ensure all promises resolve
        await new Promise((resolve) => process.nextTick(resolve));
        // Ensure the state changes are reflected
        component.update();

        expect(component).toMatchSnapshot();
      });
    });
    describe('locked', () => {
      test('should show pagination controls, features count, and layer select', async () => {
        const component = shallow(
          <Footer {...defaultProps} isLocked={true} features={MULTI_FEATURES_MULTI_LAYERS} />
        );

        // Ensure all promises resolve
        await new Promise((resolve) => process.nextTick(resolve));
        // Ensure the state changes are reflected
        component.update();

        expect(component).toMatchSnapshot();
      });
    });
  });
});
