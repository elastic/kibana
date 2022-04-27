/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiEmptyPrompt, EuiButton } from '@elastic/eui';

import { EuiButtonTo } from '../react_router_helpers';

import { NotFoundPrompt } from '.';

describe('NotFoundPrompt', () => {
  const subject = (props?: object) =>
    shallow(<NotFoundPrompt productSupportUrl="" {...props} />)
      .find(EuiEmptyPrompt)
      .dive();

  it('renders', () => {
    const wrapper = subject({
      productSupportUrl: 'https://discuss.elastic.co/c/enterprise-search/app-search/',
    });

    expect(wrapper.find('h1').text()).toEqual('404 error');
    expect(wrapper.find(EuiButtonTo).prop('to')).toEqual('/');
    expect(wrapper.find(EuiButton).prop('href')).toContain('https://discuss.elastic.co');
  });

  it('renders with a custom "Back to dashboard" link if passed', () => {
    const wrapper = subject({
      productSupportUrl: 'https://discuss.elastic.co/c/enterprise-search/workplace-search/',
      backToLink: '/workplace_search/p/sources',
    });

    expect(wrapper.find(EuiButtonTo).prop('to')).toEqual('/workplace_search/p/sources');
  });

  it('renders with a link to our licensed support URL for gold+ licenses', () => {
    setMockValues({ hasGoldLicense: true });
    const wrapper = subject();

    expect(wrapper.find(EuiButton).prop('href')).toEqual('https://support.elastic.co');
  });
});
