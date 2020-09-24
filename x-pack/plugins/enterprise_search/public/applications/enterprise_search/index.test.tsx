/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../__mocks__/shallow_usecontext.mock';

import React, { useContext } from 'react';
import { shallow } from 'enzyme';
import { EuiPage } from '@elastic/eui';

import '../__mocks__/kea.mock';
import { useValues } from 'kea';

import { EnterpriseSearch } from './';
import { SetupGuide } from './components/setup_guide';
import { ErrorConnecting } from './components/error_connecting';
import { ProductSelector } from './components/product_selector';

describe('EnterpriseSearch', () => {
  beforeEach(() => {
    (useValues as jest.Mock).mockReturnValue({ errorConnecting: false });
    (useContext as jest.Mock).mockImplementationOnce(() => ({ config: { host: 'localhost' } }));
  });

  it('renders the Setup Guide and Product Selector', () => {
    const wrapper = shallow(<EnterpriseSearch />);

    expect(wrapper.find(SetupGuide)).toHaveLength(1);
    expect(wrapper.find(ProductSelector)).toHaveLength(1);
  });

  it('renders the error connecting prompt when host is not configured', () => {
    (useValues as jest.Mock).mockReturnValueOnce({ errorConnecting: true });
    (useContext as jest.Mock).mockImplementationOnce(() => ({ config: { host: '' } }));

    const wrapper = shallow(<EnterpriseSearch />);

    expect(wrapper.find(ErrorConnecting)).toHaveLength(1);
    expect(wrapper.find(EuiPage)).toHaveLength(0);
    expect(wrapper.find(ProductSelector)).toHaveLength(0);
  });
});
