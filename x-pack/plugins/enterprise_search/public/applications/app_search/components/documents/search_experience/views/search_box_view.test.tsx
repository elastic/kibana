/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { shallow } from 'enzyme';
import { EuiFieldSearch } from '@elastic/eui';

import { SearchBoxView } from './search_box_view';

describe('SearchBoxView', () => {
  const props = {
    onChange: jest.fn(),
    value: 'foo',
    inputProps: { placeholder: 'bar' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders', () => {
    const wrapper = shallow(<SearchBoxView {...props} />);
    expect(wrapper.type()).toEqual(EuiFieldSearch);
  });

  it('passes through an onChange to EuiFieldSearch', () => {
    const wrapper = shallow(<SearchBoxView {...props} />);
    wrapper.prop('onChange')({ target: { value: 'test' } });
    expect(props.onChange).toHaveBeenCalledWith('test');
  });
});
