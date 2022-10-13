/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiCallOut } from '@elastic/eui';

import { Errors } from '.';

describe('Errors', () => {
  it('does not render if no errors or warnings to render', () => {
    setMockValues({ errors: [], warnings: [] });
    const wrapper = shallow(<Errors />);

    expect(wrapper.find(EuiCallOut)).toHaveLength(0);
  });

  it('renders errors', () => {
    setMockValues({ errors: ['error 1', 'error 2'], warnings: [] });
    const wrapper = shallow(<Errors />);

    expect(wrapper.find(EuiCallOut)).toHaveLength(1);
    expect(wrapper.find(EuiCallOut).prop('title')).toEqual(
      'Something went wrong. Please address the errors and try again.'
    );
    expect(wrapper.find('p').first().text()).toEqual('error 1');
    expect(wrapper.find('p').last().text()).toEqual('error 2');
  });

  it('renders warnings', () => {
    setMockValues({ errors: [], warnings: ['document size warning'] });
    const wrapper = shallow(<Errors />);

    expect(wrapper.find(EuiCallOut)).toHaveLength(1);
    expect(wrapper.find(EuiCallOut).prop('title')).toEqual('Warning!');
    expect(wrapper.find('p').text()).toEqual('document size warning');
  });

  it('renders both errors and warnings', () => {
    setMockValues({ errors: ['some error'], warnings: ['some warning'] });
    const wrapper = shallow(<Errors />);

    expect(wrapper.find(EuiCallOut)).toHaveLength(2);
  });
});
