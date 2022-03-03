/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { VersionMismatchPage } from '../shared/version_mismatch';
import { rerender } from '../test_helpers';

import { ErrorConnecting } from './components/error_connecting';
import { ProductSelector } from './components/product_selector';
import { SetupGuide } from './components/setup_guide';

import { EnterpriseSearchOverview } from './';

describe('EnterpriseSearchOverview', () => {
  it('renders the Setup Guide and Product Selector', () => {
    setMockValues({
      errorConnectingMessage: '',
      config: { host: 'localhost' },
    });
    const wrapper = shallow(<EnterpriseSearchOverview />);

    expect(wrapper.find(SetupGuide)).toHaveLength(1);
    expect(wrapper.find(ProductSelector)).toHaveLength(1);
  });

  it('renders the error connecting prompt only if host is configured', () => {
    setMockValues({
      errorConnectingMessage: '502 Bad Gateway',
      config: { host: 'localhost' },
    });
    const wrapper = shallow(<EnterpriseSearchOverview />);

    expect(wrapper.find(VersionMismatchPage)).toHaveLength(0);
    const errorConnecting = wrapper.find(ErrorConnecting);
    expect(errorConnecting).toHaveLength(1);
    expect(wrapper.find(ProductSelector)).toHaveLength(0);

    setMockValues({
      errorConnectingMessage: '502 Bad Gateway',
      config: { host: '' },
    });
    rerender(wrapper);

    expect(wrapper.find(VersionMismatchPage)).toHaveLength(0);
    expect(wrapper.find(ErrorConnecting)).toHaveLength(0);
    expect(wrapper.find(ProductSelector)).toHaveLength(1);
  });

  it('renders the version error message if versions mismatch and the host is configured', () => {
    setMockValues({
      errorConnectingMessage: '',
      config: { host: 'localhost' },
    });
    const wrapper = shallow(
      <EnterpriseSearchOverview enterpriseSearchVersion="7.15.0" kibanaVersion="7.16.0" />
    );

    expect(wrapper.find(VersionMismatchPage)).toHaveLength(1);
    expect(wrapper.find(ErrorConnecting)).toHaveLength(0);
    expect(wrapper.find(ProductSelector)).toHaveLength(0);
  });
});
