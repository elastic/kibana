/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { shallow } from 'enzyme';

import { Credential } from './credential';
import { EuiButtonIcon } from '@elastic/eui';

describe('Credential', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const props = {
    copy: jest.fn(),
    toggleIsHidden: jest.fn(),
    isHidden: true,
    text: '*****',
  };

  it('renders', () => {
    const wrapper = shallow(<Credential {...props} />);
    expect(wrapper.find(EuiButtonIcon).length).toEqual(2);
  });

  it('will call copy when the first button is clicked', () => {
    const wrapper = shallow(<Credential {...props} />);
    (wrapper.find(EuiButtonIcon).at(0).props() as any).onClick();
    expect(props.copy).toHaveBeenCalled();
  });

  it('will call hide when the second button is clicked', () => {
    const wrapper = shallow(<Credential {...props} />);
    (wrapper.find(EuiButtonIcon).at(1).props() as any).onClick();
    expect(props.toggleIsHidden).toHaveBeenCalled();
  });

  it('will render the "eye" icon when isHidden is true', () => {
    const wrapper = shallow(<Credential {...props} />);
    expect((wrapper.find(EuiButtonIcon).at(1).props() as any).iconType).toBe('eye');
  });

  it('will render the "eyeClosed" icon when isHidden is false', () => {
    const wrapper = shallow(<Credential {...{ ...props, isHidden: false }} />);
    expect((wrapper.find(EuiButtonIcon).at(1).props() as any).iconType).toBe('eyeClosed');
  });

  it('will render text after the 2 icons', () => {
    const wrapper = shallow(<Credential {...props} />);
    expect(wrapper.text().replace('<EuiButtonIcon /><EuiButtonIcon />', '')).toBe('*****');
  });
});
