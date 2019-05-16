/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';
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
  properties: [],
  closeTooltip: () => {},
  showFilterButtons: false,
  showCloseButton: false
};


const mockTooltipProperties = [
  new MockTooltipProperty('foo', 'bar', true),
  new MockTooltipProperty('foo', 'bar', false)
];

describe('FeatureTooltip', () => {

  test('should not show close button and not show filter button', () => {
    const component = shallowWithIntl(
      <FeatureTooltip
        {...defaultProps}
      />
    );

    expect(component)
      .toMatchSnapshot();
  });

  test('should show close button, but not filter button', () => {
    const component = shallowWithIntl(
      <FeatureTooltip
        {...defaultProps}
        showCloseButton={true}
      />
    );

    expect(component)
      .toMatchSnapshot();
  });

  test('should show only filter button for filterable properties', () => {
    const component = shallowWithIntl(
      <FeatureTooltip
        {...defaultProps}
        showFilterButtons={true}
        properties={mockTooltipProperties}
      />
    );

    expect(component)
      .toMatchSnapshot();
  });

  test('should show both filter buttons and close button', () => {
    const component = shallowWithIntl(
      <FeatureTooltip
        {...defaultProps}
        showFilterButtons={true}
        showCloseButton={true}
        properties={mockTooltipProperties}
      />
    );

    expect(component)
      .toMatchSnapshot();
  });


});
