/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { FeatureProperties } from './feature_properties';
import { ACTION_GLOBAL_APPLY_FILTER } from '../../../../../../../src/plugins/data/public';

class MockTooltipProperty {
  constructor(key, value, isFilterable) {
    this._key = key;
    this._value = value;
    this._isFilterable = isFilterable;
  }

  isFilterable() {
    return this._isFilterable;
  }

  getHtmlDisplayValue() {
    return this._value;
  }

  getPropertyName() {
    return this._key;
  }
}

const defaultProps = {
  loadFeatureProperties: () => {
    return [];
  },
  featureId: `feature`,
  layerId: `layer`,
  onCloseTooltip: () => {},
  showFilterButtons: false,
  getFilterActions: () => {
    return [{ id: ACTION_GLOBAL_APPLY_FILTER }];
  },
};

const mockTooltipProperties = [
  new MockTooltipProperty('prop1', 'foobar1', true),
  new MockTooltipProperty('prop2', 'foobar2', false),
];

describe('FeatureProperties', () => {
  test('should render', async () => {
    const component = shallow(
      <FeatureProperties
        {...defaultProps}
        loadFeatureProperties={() => {
          return mockTooltipProperties;
        }}
      />
    );

    // Ensure all promises resolve
    await new Promise((resolve) => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(component).toMatchSnapshot();
  });

  test('should show filter button for filterable properties', async () => {
    const component = shallow(
      <FeatureProperties
        {...defaultProps}
        showFilterButtons={true}
        loadFeatureProperties={() => {
          return mockTooltipProperties;
        }}
      />
    );

    // Ensure all promises resolve
    await new Promise((resolve) => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(component).toMatchSnapshot();
  });

  test('should show view actions button when there are available actions', async () => {
    const component = shallow(
      <FeatureProperties
        {...defaultProps}
        showFilterButtons={true}
        loadFeatureProperties={() => {
          return mockTooltipProperties;
        }}
        getFilterActions={() => {
          return [{ id: 'drilldown1' }];
        }}
      />
    );

    // Ensure all promises resolve
    await new Promise((resolve) => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(component).toMatchSnapshot();
  });

  test('should show error message if unable to load tooltip content', async () => {
    const component = shallow(
      <FeatureProperties
        {...defaultProps}
        showFilterButtons={true}
        loadFeatureProperties={() => {
          throw new Error('Simulated load properties error');
        }}
      />
    );

    // Ensure all promises resolve
    await new Promise((resolve) => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(component).toMatchSnapshot();
  });
});
