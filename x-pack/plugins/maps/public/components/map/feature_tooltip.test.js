/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { FeatureTooltip } from './feature_tooltip';

class MockTooltipProperty {
  constructor(key, value, isFilterable) {
    this._key = key;
    this._value = value;
    this._isFilterable = isFilterable;
  }

  isFilterable() {
    return this._isFilterable;
  }

  getFilterAction() {
    return () => {};
  }

  getHtmlDisplayValue() {
    return this._value;
  }

  getPropertyName() {
    return this._key;
  }
}

const defaultProps = {
  loadFeatureProperties: () => { return []; },
  tooltipState: {
    layerId: 'layer1',
    featureId: 'feature1',
  },
  closeTooltip: () => {},
  showFilterButtons: false,
  showCloseButton: false
};


const mockTooltipProperties = [
  new MockTooltipProperty('foo', 'bar', true),
  new MockTooltipProperty('foo', 'bar', false)
];

describe('FeatureTooltip', async () => {

  test('should not show close button and not show filter button', async () => {
    const component = shallow(
      <FeatureTooltip
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

  test('should show close button, but not filter button', async () => {
    const component = shallow(
      <FeatureTooltip
        {...defaultProps}
        showCloseButton={true}
      />
    );

    // Ensure all promises resolve
    await new Promise(resolve => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(component)
      .toMatchSnapshot();
  });

  test('should show only filter button for filterable properties', async () => {
    const component = shallow(
      <FeatureTooltip
        {...defaultProps}
        showFilterButtons={true}
        loadFeatureProperties={() => { return mockTooltipProperties; }}
      />
    );

    // Ensure all promises resolve
    await new Promise(resolve => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(component)
      .toMatchSnapshot();
  });

  test('should show both filter buttons and close button', async () => {
    const component = shallow(
      <FeatureTooltip
        {...defaultProps}
        showFilterButtons={true}
        showCloseButton={true}
        loadFeatureProperties={() => { return mockTooltipProperties; }}
      />
    );

    // Ensure all promises resolve
    await new Promise(resolve => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(component)
      .toMatchSnapshot();
  });

  test('should show error message if unable to load tooltip content', async () => {
    const component = shallow(
      <FeatureTooltip
        {...defaultProps}
        showFilterButtons={true}
        showCloseButton={true}
        loadFeatureProperties={() => { throw new Error('Simulated load properties error'); }}
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
