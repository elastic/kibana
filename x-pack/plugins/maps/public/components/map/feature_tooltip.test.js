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
  isFilterable: false,
  showCloseButton: false
};


const mockTooltipProperties = [
  new MockTooltipProperty('foo', 'bar', true),
  new MockTooltipProperty('foo', 'bar', false)
];

describe('FeatureTooltip', () => {

  test('should not show close button', () => {
    const component = shallowWithIntl(
      <FeatureTooltip
        {...defaultProps}
      />
    );

    expect(component)
      .toMatchSnapshot();
  });

  test('should show close button', () => {
    const component = shallowWithIntl(
      <FeatureTooltip
        {...defaultProps}
        showCloseButton={true}
      />
    );

    expect(component)
      .toMatchSnapshot();
  });

  test('should show filter action for filterable properties', () => {
    const component = shallowWithIntl(
      <FeatureTooltip
        {...defaultProps}
        isFilterable={true}
        properties={mockTooltipProperties}
      />
    );

    expect(component)
      .toMatchSnapshot();
  });

  test('should not show filter action for filterable properties', () => {
    const component = shallowWithIntl(
      <FeatureTooltip
        {...defaultProps}
        isFilterable={false}
        properties={mockTooltipProperties}
      />
    );

    expect(component)
      .toMatchSnapshot();
  });


});
