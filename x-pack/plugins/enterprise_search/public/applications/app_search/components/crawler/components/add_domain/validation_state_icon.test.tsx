/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { EuiIcon, EuiLoadingSpinner } from '@elastic/eui';

import { ValidationStateIcon } from './validation_state_icon';

describe('ValidationStateIcon', () => {
  it('shows a success icon when valid', () => {
    const wrapper = shallow(<ValidationStateIcon state="valid" />);

    expect(wrapper.find(EuiIcon).prop('color')).toEqual('success');
  });

  it('shows a warning icon when warning', () => {
    const wrapper = shallow(<ValidationStateIcon state="warning" />);

    expect(wrapper.find(EuiIcon).prop('color')).toEqual('warning');
  });

  it('shows a danger icon when invalid', () => {
    const wrapper = shallow(<ValidationStateIcon state="invalid" />);

    expect(wrapper.find(EuiIcon).prop('color')).toEqual('danger');
  });

  it('shows a loading spinner by default', () => {
    const wrapper = shallow(<ValidationStateIcon state="loading" />);

    expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(1);
  });
});
