/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { EuiSelect } from '@elastic/eui';

import { SchemaExistingField } from './';

describe('SchemaExistingField', () => {
  const updateExistingFieldType = jest.fn();
  const props = {
    fieldName: 'foo',
    fieldType: 'field',
    updateExistingFieldType,
  };

  it('renders', () => {
    const wrapper = shallow(<SchemaExistingField {...props} />);

    expect(wrapper.find(EuiSelect)).toHaveLength(1);
  });

  it('renders no EuiSelect without props', () => {
    const wrapper = shallow(<SchemaExistingField fieldName="foo" />);

    expect(wrapper.find(EuiSelect)).toHaveLength(0);
  });

  it('calls updateExistingFieldType when the select value is changed', () => {
    const wrapper = shallow(<SchemaExistingField {...props} />);
    wrapper.find(EuiSelect).simulate('change', { target: { value: 'bar' } });

    expect(updateExistingFieldType).toHaveBeenCalledWith(props.fieldName, 'bar');
  });

  it('doesn`t render fieldName when hidden', () => {
    const wrapper = shallow(<SchemaExistingField {...props} hideName />);

    expect(wrapper.find('.c-stui-engine-schema-field__name').contains(props.fieldName)).toBeFalsy();
  });

  it('renders unconfirmed message', () => {
    const wrapper = shallow(<SchemaExistingField {...props} unconfirmed />);

    expect(wrapper.find('.c-stui-engine-schema-field__status').exists()).toBeTruthy();
  });
});
