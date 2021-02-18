/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { EuiToken } from '@elastic/eui';

import { BoostIcon } from './boost_icon';
import { BoostType } from './types';

describe('BoostIcon', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a token according to the provided type', () => {
    const wrapper = shallow(<BoostIcon type={'value' as BoostType} />);
    expect(wrapper.find(EuiToken).prop('iconType')).toBe('tokenNumber');
  });
});
