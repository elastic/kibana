/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable max-classes-per-file */

jest.mock('./icon_stops', () => ({
  IconStops: () => {
    return <div>mockIconStops</div>;
  },
}));

jest.mock('../../symbol_utils', () => {
  return {
    getIconPaletteOptions: () => {
      return [
        { value: 'filledShapes', inputDisplay: <div>mock filledShapes option</div> },
        { value: 'hollowShapes', inputDisplay: <div>mock hollowShapes option</div> },
      ];
    },
    PREFERRED_ICONS: ['circle'],
  };
});

import React from 'react';
import { shallow } from 'enzyme';

import { FIELD_ORIGIN } from '../../../../../../common/constants';
import { AbstractField } from '../../../../fields/field';
import { IDynamicStyleProperty } from '../../properties/dynamic_style_property';
import { IconDynamicOptions } from '../../../../../../common/descriptor_types';
import { IconMapSelect } from './icon_map_select';

class MockField extends AbstractField {}

class MockDynamicStyleProperty {
  getField() {
    return new MockField({ fieldName: 'myField', origin: FIELD_ORIGIN.SOURCE });
  }

  getValueSuggestions() {
    return [];
  }
}

const defaultProps = {
  iconPaletteId: 'filledShapes',
  onChange: () => {},
  styleProperty: (new MockDynamicStyleProperty() as unknown) as IDynamicStyleProperty<
    IconDynamicOptions
  >,
  isCustomOnly: false,
};

test('Should render default props', () => {
  const component = shallow(<IconMapSelect {...defaultProps} />);

  expect(component).toMatchSnapshot();
});

test('Should render custom stops input when useCustomIconMap', () => {
  const component = shallow(
    <IconMapSelect
      {...defaultProps}
      useCustomIconMap={true}
      customIconStops={[
        { stop: null, icon: 'circle' },
        { stop: 'value1', icon: 'marker' },
      ]}
    />
  );

  expect(component).toMatchSnapshot();
});

test('Should not render icon map select when isCustomOnly', () => {
  const component = shallow(<IconMapSelect {...defaultProps} isCustomOnly={true} />);

  expect(component).toMatchSnapshot();
});
