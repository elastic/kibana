/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';

import { FieldTypeIcon } from './field_type_icon_view';

describe('FieldTypeIcon', () => {

  test(`don't render component when type is undefined`, () => {
    const wrapper = shallow(<FieldTypeIcon />);
    expect(wrapper.isEmptyRender()).toBeTruthy();
  });

  test(`don't render component when type doesn't match a field type`, () => {
    const wrapper = shallow(<FieldTypeIcon type="foo" />);
    expect(wrapper.isEmptyRender()).toBeTruthy();
  });

  test(`render component when type matches a field type`, () => {
    const wrapper = shallow(<FieldTypeIcon type="keyword" />);
    expect(wrapper).toMatchSnapshot();
  });

  test(`render component inside tooltip wrapper`, () => {
    const wrapper = shallow(<FieldTypeIcon type="keyword" tooltipEnabled={true} />);
    expect(wrapper).toMatchSnapshot();
  });

  test(`update component`, () => {
    const wrapper = shallow(<FieldTypeIcon />);
    expect(wrapper.isEmptyRender()).toBeTruthy();
    wrapper.setProps({ type: 'keyword' });
    expect(wrapper).toMatchSnapshot();
  });

});
