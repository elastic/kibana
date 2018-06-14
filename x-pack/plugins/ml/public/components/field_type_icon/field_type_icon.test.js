/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import React from 'react';

import { FieldTypeIcon } from './field_type_icon';

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

  test(`render with tooltip and test hovering`, () => {
    const wrapper = mount(<FieldTypeIcon type="keyword" tooltipEnabled={true} />);
    const container = wrapper.find({ className: 'field-type-icon-container' });

    expect(wrapper.find('EuiToolTip').children()).toHaveLength(1);

    container.simulate('mouseover');
    expect(wrapper.find('EuiToolTip').children()).toHaveLength(2);

    container.simulate('mouseout');
    expect(wrapper.find('EuiToolTip').children()).toHaveLength(1);
  });

  test(`update component`, () => {
    const wrapper = shallow(<FieldTypeIcon />);
    expect(wrapper.isEmptyRender()).toBeTruthy();
    wrapper.setProps({ type: 'keyword' });
    expect(wrapper).toMatchSnapshot();
  });

});
