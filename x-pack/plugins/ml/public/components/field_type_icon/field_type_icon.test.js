/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mountWithIntl, shallowWithIntl } from 'test_utils/enzyme_helpers';
import React from 'react';

import { FieldTypeIcon } from './field_type_icon';
import { ML_JOB_FIELD_TYPES } from '../../../common/constants/field_types';

describe('FieldTypeIcon', () => {

  test(`don't render component when type is undefined`, () => {
    const wrapper = shallowWithIntl(<FieldTypeIcon.WrappedComponent />);
    expect(wrapper.isEmptyRender()).toBeTruthy();
  });

  test(`don't render component when type doesn't match a field type`, () => {
    const wrapper = shallowWithIntl(<FieldTypeIcon.WrappedComponent type="foo" />);
    expect(wrapper.isEmptyRender()).toBeTruthy();
  });

  test(`render component when type matches a field type`, () => {
    const wrapper = shallowWithIntl(<FieldTypeIcon.WrappedComponent type={ML_JOB_FIELD_TYPES.KEYWORD} />);
    expect(wrapper).toMatchSnapshot();
  });

  test(`render with tooltip and test hovering`, () => {
    const wrapper = mountWithIntl(<FieldTypeIcon.WrappedComponent type={ML_JOB_FIELD_TYPES.KEYWORD} tooltipEnabled={true} />);
    const container = wrapper.find({ className: 'field-type-icon-container' });

    expect(wrapper.find('EuiToolTip').children()).toHaveLength(1);

    container.simulate('mouseover');
    expect(wrapper.find('EuiToolTip').children()).toHaveLength(2);

    container.simulate('mouseout');
    expect(wrapper.find('EuiToolTip').children()).toHaveLength(1);
  });

  test(`update component`, () => {
    const wrapper = shallowWithIntl(<FieldTypeIcon.WrappedComponent />);
    expect(wrapper.isEmptyRender()).toBeTruthy();
    wrapper.setProps({ type: ML_JOB_FIELD_TYPES.IP });
    expect(wrapper).toMatchSnapshot();
  });

});
