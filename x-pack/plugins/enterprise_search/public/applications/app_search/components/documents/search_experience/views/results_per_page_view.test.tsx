/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { shallow } from 'enzyme';
import { EuiSelect } from '@elastic/eui';

import { ResultsPerPageView } from '.';

describe('ResultsPerPageView', () => {
  const props = {
    options: [1, 2, 3],
    value: 1,
    onChange: jest.fn(),
  };

  it('renders', () => {
    const wrapper = shallow(<ResultsPerPageView {...props} />);
    expect(wrapper.find(EuiSelect).length).toBe(1);
  });

  it('maps options to correct EuiSelect option', () => {
    const wrapper = shallow(<ResultsPerPageView {...props} />);
    expect(wrapper.find(EuiSelect).prop('options')).toEqual([
      { text: 1, value: 1 },
      { text: 2, value: 2 },
      { text: 3, value: 3 },
    ]);
  });

  it('passes through the value if it exists in options', () => {
    const wrapper = shallow(<ResultsPerPageView {...props} />);
    expect(wrapper.find(EuiSelect).prop('value')).toEqual(1);
  });

  it('does not pass through the value if it does not exist in options', () => {
    const wrapper = shallow(
      <ResultsPerPageView
        {...{
          ...props,
          value: 999,
        }}
      />
    );
    expect(wrapper.find(EuiSelect).prop('value')).toBeUndefined();
  });

  it('passes through an onChange to EuiSelect', () => {
    const wrapper = shallow(<ResultsPerPageView {...props} />);
    const onChange: any = wrapper.find(EuiSelect).prop('onChange');
    onChange({ target: { value: 2 } });
    expect(props.onChange).toHaveBeenCalledWith(2);
  });
});
