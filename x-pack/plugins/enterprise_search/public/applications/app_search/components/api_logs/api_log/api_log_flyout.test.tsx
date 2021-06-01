/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues, setMockActions } from '../../../../__mocks__/kea_logic';
import { mockApiLog } from '../__mocks__/api_log.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiFlyout, EuiBadge } from '@elastic/eui';

import { ApiLogFlyout, ApiLogHeading } from './api_log_flyout';

describe('ApiLogFlyout', () => {
  const values = {
    isFlyoutOpen: true,
    apiLog: mockApiLog,
  };
  const actions = {
    closeFlyout: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(values);
    setMockActions(actions);
  });

  it('renders', () => {
    const wrapper = shallow(<ApiLogFlyout />);

    expect(wrapper.find('h2').text()).toEqual('Request details');
    expect(wrapper.find(ApiLogHeading).last().dive().find('h3').text()).toEqual('Response body');
    expect(wrapper.find(EuiBadge).prop('children')).toEqual('POST');
  });

  it('closes the flyout', () => {
    const wrapper = shallow(<ApiLogFlyout />);

    wrapper.find(EuiFlyout).simulate('close');
    expect(actions.closeFlyout).toHaveBeenCalled();
  });

  it('does not render if the flyout is not open', () => {
    setMockValues({ ...values, isFlyoutOpen: false });
    const wrapper = shallow(<ApiLogFlyout />);

    expect(wrapper.isEmptyRender()).toBe(true);
  });

  it('does not render if a current apiLog has not been set', () => {
    setMockValues({ ...values, apiLog: null });
    const wrapper = shallow(<ApiLogFlyout />);

    expect(wrapper.isEmptyRender()).toBe(true);
  });
});
