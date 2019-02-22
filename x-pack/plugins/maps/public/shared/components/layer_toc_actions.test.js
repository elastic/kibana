/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { LayerTocActions } from './layer_toc_actions';

let supportsFitToBounds;
let isLayerLoading;
let isVisible;
let hasErrors;
let showAtZoomLevel;
const layerMock = {
  supportsFitToBounds: () => { return supportsFitToBounds; },
  isVisible: () => { return isVisible; },
  hasErrors: () => { return hasErrors; },
  getErrors: () => { return 'simulated layer error'; },
  isLayerLoading: () => { return isLayerLoading; },
  showAtZoomLevel: () => { return showAtZoomLevel; },
  getZoomConfig: () => { return { minZoom: 2, maxZoom: 3 }; },
  getIcon: () => { return (<div>icon mock</div>); },
};

const defaultProps = {
  displayName: 'layer1',
  zoom: 0,
  layer: layerMock,
};

describe('LayerTocActions', () => {
  beforeEach(() => {
    supportsFitToBounds = true;
    isLayerLoading = false;
    isVisible = true;
    hasErrors = false;
    showAtZoomLevel = true;
  });

  test('is rendered', async () => {
    const component = shallow(
      <LayerTocActions
        {...defaultProps}
      />
    );

    // Ensure all promises resolve
    await new Promise(resolve => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(component)
      .toMatchSnapshot();
  });

  test('should disable fit to data when supportsFitToBounds is false', async () => {
    supportsFitToBounds = false;
    const component = shallow(
      <LayerTocActions
        {...defaultProps}
      />
    );

    // Ensure all promises resolve
    await new Promise(resolve => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(component)
      .toMatchSnapshot();
  });

  test('should display spinner when layer is loading', async () => {
    isLayerLoading = true;
    const component = shallow(
      <LayerTocActions
        {...defaultProps}
      />
    );

    // Ensure all promises resolve
    await new Promise(resolve => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(component)
      .toMatchSnapshot();
  });

  test('should show warning when layer has errors', async () => {
    hasErrors = true;
    const component = shallow(
      <LayerTocActions
        {...defaultProps}
      />
    );

    // Ensure all promises resolve
    await new Promise(resolve => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(component)
      .toMatchSnapshot();
  });

  test('should show visible toggle when layer is not visible', async () => {
    isVisible = false;
    const component = shallow(
      <LayerTocActions
        {...defaultProps}
      />
    );

    // Ensure all promises resolve
    await new Promise(resolve => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(component)
      .toMatchSnapshot();
  });

  test('should provide feedback when layer is not visible because of current zoom level', async () => {
    showAtZoomLevel = false;
    const component = shallow(
      <LayerTocActions
        {...defaultProps}
      />
    );

    // Ensure all promises resolve
    await new Promise(resolve => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(component)
      .toMatchSnapshot();
  });
});
