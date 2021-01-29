/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { EuiButtonIcon } from '@elastic/eui';

import { Key } from './key';

describe('Key', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const props = {
    copy: jest.fn(),
    toggleIsHidden: jest.fn(),
    isHidden: true,
    text: 'some-api-key',
  };

  it('renders', () => {
    const wrapper = shallow(<Key {...props} />);
    expect(wrapper.find(EuiButtonIcon).length).toEqual(2);
  });

  it('will call copy when the first button is clicked', () => {
    const wrapper = shallow(<Key {...props} />);
    wrapper.find(EuiButtonIcon).first().simulate('click');
    expect(props.copy).toHaveBeenCalled();
  });

  it('will call hide when the second button is clicked', () => {
    const wrapper = shallow(<Key {...props} />);
    wrapper.find(EuiButtonIcon).last().simulate('click');
    expect(props.toggleIsHidden).toHaveBeenCalled();
  });

  it('will render the "eye" icon when isHidden is true', () => {
    const wrapper = shallow(<Key {...props} />);
    expect(wrapper.find(EuiButtonIcon).last().prop('iconType')).toBe('eye');
  });

  it('will render the "eyeClosed" icon when isHidden is false', () => {
    const wrapper = shallow(<Key {...{ ...props, isHidden: false }} />);
    expect(wrapper.find(EuiButtonIcon).last().prop('iconType')).toBe('eyeClosed');
  });

  it('will render the provided text', () => {
    const wrapper = shallow(<Key {...props} />);
    expect(wrapper.text()).toContain('some-api-key');
  });
});
