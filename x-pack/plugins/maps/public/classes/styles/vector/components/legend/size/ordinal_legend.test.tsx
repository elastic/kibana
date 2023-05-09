/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { FIELD_ORIGIN, VECTOR_STYLES } from '../../../../../../../common/constants';
import type { DynamicSizeProperty } from '../../../properties/dynamic_size_property';
import type { IField } from '../../../../../fields/field';
import { OrdinalLegend } from './ordinal_legend';

const dynamicSizeOptions = {
  minSize: 1,
  maxSize: 10,
  field: {
    name: 'bytes',
    origin: FIELD_ORIGIN.SOURCE,
  },
  fieldMetaOptions: {
    isEnabled: true,
    sigma: 3,
  },
  invert: false,
};

const mockStyle = {
  formatField: (value: number) => {
    return `${value * 0.001}KB`;
  },
  getDisplayStyleName: () => {
    return 'Border width';
  },
  getField: () => {
    return {
      getLabel: () => {
        return 'bytes';
      },
    } as unknown as IField;
  },
  getOptions: () => {
    return dynamicSizeOptions;
  },
  getRangeFieldMeta: () => {
    return {
      min: 0,
      max: 19000,
      delta: 19000,
    };
  },
  getStyleName: () => {
    return VECTOR_STYLES.LINE_WIDTH;
  },
  isFieldMetaEnabled: () => {
    return true;
  },
} as unknown as DynamicSizeProperty;

test('Should render legend', async () => {
  const component = shallow(<OrdinalLegend style={mockStyle} />);

  // Ensure all promises resolve
  await new Promise((resolve) => process.nextTick(resolve));
  // Ensure the state changes are reflected
  component.update();

  expect(component).toMatchSnapshot();
});
