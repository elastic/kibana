/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockActions, setMockValues } from '../../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiButton } from '@elastic/eui';

import { AddResultButton } from '.';

describe('AddResultButton', () => {
  const values = {
    isAutomated: false,
  };

  const actions = {
    openFlyout: jest.fn(),
  };

  it('renders', () => {
    const wrapper = shallow(<AddResultButton />);

    expect(wrapper.is(EuiButton)).toBe(true);
  });

  it('opens the add result flyout on click', () => {
    setMockActions(actions);
    const wrapper = shallow(<AddResultButton />);

    wrapper.find(EuiButton).simulate('click');
    expect(actions.openFlyout).toHaveBeenCalled();
  });

  it('is disbled when the curation is automated', () => {
    setMockValues({ ...values, isAutomated: true });
    const wrapper = shallow(<AddResultButton />);

    expect(wrapper.find(EuiButton).prop('disabled')).toBe(true);
  });
});
