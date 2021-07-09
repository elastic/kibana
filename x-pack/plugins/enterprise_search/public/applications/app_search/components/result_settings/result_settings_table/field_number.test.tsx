/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { EuiFieldNumber } from '@elastic/eui';

import { FieldResultSetting } from '../types';

import { FieldNumber } from './field_number';

describe('FieldNumber', () => {
  const fieldSettings = {
    raw: true,
    rawSize: 29,
    snippet: true,
    snippetFallback: true,
    snippetSize: 15,
  };

  const props = {
    fieldSettings,
    fieldName: 'foo',
    fieldEnabledProperty: 'raw' as keyof FieldResultSetting,
    fieldSizeProperty: 'rawSize' as keyof FieldResultSetting,
    updateAction: jest.fn(),
    clearAction: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('is rendered with its value set from [fieldSizeProperty] in fieldSettings', () => {
    const wrapper = shallow(<FieldNumber {...props} />);
    expect(wrapper.find(EuiFieldNumber).prop('value')).toEqual(29);
  });

  it('has no value if [fieldSizeProperty] in fieldSettings has no value', () => {
    const wrapper = shallow(
      <FieldNumber
        {...{
          ...props,
          fieldSettings: {
            raw: true,
            snippet: false,
          },
        }}
      />
    );
    expect(wrapper.find(EuiFieldNumber).prop('value')).toEqual(' ');
  });

  it('is disabled if the [fieldEnabledProperty] in fieldSettings is false', () => {
    const wrapper = shallow(
      <FieldNumber
        {...{
          ...props,
          fieldSettings: {
            raw: false,
            snippet: true,
          },
        }}
      />
    );
    expect(wrapper.find(EuiFieldNumber).prop('disabled')).toEqual(true);
  });

  it('will call updateAction when the value is changed', () => {
    const wrapper = shallow(<FieldNumber {...props} />);
    wrapper.simulate('change', { target: { value: '21' } });
    expect(props.updateAction).toHaveBeenCalledWith('foo', 21);
  });

  it('will call clearAction when the value is changed', () => {
    const wrapper = shallow(<FieldNumber {...props} />);
    wrapper.simulate('change', { target: { value: '' } });
    expect(props.clearAction).toHaveBeenCalledWith('foo');
  });

  it('will call updateAction on blur', () => {
    const wrapper = shallow(<FieldNumber {...props} />);
    wrapper.simulate('blur', { target: { value: '21' } });
    expect(props.updateAction).toHaveBeenCalledWith('foo', 21);
  });

  it('will call clearAction on blur if the current value is something other than a number', () => {
    const wrapper = shallow(<FieldNumber {...props} />);
    wrapper.simulate('blur', { target: { value: '' } });
    expect(props.clearAction).toHaveBeenCalledWith('foo');
  });

  it('will call updateAction on blur using the minimum possible value if the value is something lower than the minimum', () => {
    const wrapper = shallow(<FieldNumber {...props} />);
    wrapper.simulate('blur', { target: { value: 5 } });
    expect(props.updateAction).toHaveBeenCalledWith('foo', 20);
  });

  it('will call updateAction on blur using the maximum possible value if the value is something above than the maximum', () => {
    const wrapper = shallow(<FieldNumber {...props} />);
    wrapper.simulate('blur', { target: { value: 2000 } });
    expect(props.updateAction).toHaveBeenCalledWith('foo', 1000);
  });
});
