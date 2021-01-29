/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { shallow } from 'enzyme';
import { EuiSelect } from '@elastic/eui';

import { SortingView } from '.';

describe('SortingView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const props = {
    options: [{ label: 'Label', value: 'Value' }],
    value: 'Value',
    onChange: jest.fn(),
  };

  it('renders', () => {
    const wrapper = shallow(<SortingView {...props} />);
    expect(wrapper.find(EuiSelect).length).toBe(1);
  });

  it('maps options to correct EuiSelect option', () => {
    const wrapper = shallow(<SortingView {...props} />);
    expect(wrapper.find(EuiSelect).prop('options')).toEqual([{ text: 'Label', value: 'Value' }]);
  });

  it('passes through the value if it exists in options', () => {
    const wrapper = shallow(<SortingView {...props} />);
    expect(wrapper.find(EuiSelect).prop('value')).toEqual('Value');
  });

  it('does not pass through the value if it does not exist in options', () => {
    const wrapper = shallow(
      <SortingView
        {...{
          ...props,
          value: 'This value is not in Options',
        }}
      />
    );
    expect(wrapper.find(EuiSelect).prop('value')).toBeUndefined();
  });

  it('passes through an onChange to EuiSelect', () => {
    const wrapper = shallow(<SortingView {...props} />);
    const onChange: any = wrapper.find(EuiSelect).prop('onChange');
    onChange({ target: { value: 'test' } });
    expect(props.onChange).toHaveBeenCalledWith('test');
  });
});
