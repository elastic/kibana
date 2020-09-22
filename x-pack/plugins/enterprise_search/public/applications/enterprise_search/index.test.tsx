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
import { ErrorConnecting } from './components/error_connecting';
import { ProductCard } from './components/product_card';

describe('EnterpriseSearch', () => {
  beforeEach(() => {
    (useValues as jest.Mock).mockReturnValue({ errorConnecting: false });
    (useContext as jest.Mock).mockImplementationOnce(() => ({ config: { host: 'localhost' } }));
  });

  it('renders the overview page and product cards', () => {
    const wrapper = shallow(<EnterpriseSearch />);

    expect(wrapper.find(EuiPage).hasClass('enterpriseSearchOverview')).toBe(true);
    expect(wrapper.find(ProductCard)).toHaveLength(2);
  });

  it('renders the error connecting prompt', () => {
    (useValues as jest.Mock).mockReturnValueOnce({ errorConnecting: true });
    (useContext as jest.Mock).mockImplementationOnce(() => ({ config: { host: '' } }));

    const wrapper = shallow(<EnterpriseSearch />);

    expect(wrapper.find(ErrorConnecting)).toHaveLength(1);
    expect(wrapper.find(EuiPage)).toHaveLength(0);
  });
});
