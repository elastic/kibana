/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockActions } from '../../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import { EuiButton } from '@elastic/eui';

import { AddResultButton } from './';

describe('AddResultButton', () => {
  const actions = {
    openFlyout: jest.fn(),
  };

  let wrapper: ShallowWrapper;

  beforeAll(() => {
    setMockActions(actions);
    wrapper = shallow(<AddResultButton />);
  });

  it('renders', () => {
    expect(wrapper.find(EuiButton)).toHaveLength(1);
  });

  it('opens the add result flyout on click', () => {
    wrapper.find(EuiButton).simulate('click');
    expect(actions.openFlyout).toHaveBeenCalled();
  });
});
