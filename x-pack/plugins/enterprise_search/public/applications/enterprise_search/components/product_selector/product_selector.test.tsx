/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../../__mocks__/shallow_usecontext.mock';

import React, { useContext } from 'react';
import { shallow } from 'enzyme';
import { EuiPage } from '@elastic/eui';

import '../../../__mocks__/kea.mock';
import { useValues } from 'kea';

import { ProductSelector } from './';
import { ProductCard } from '../product_card';

describe('ProductSelector', () => {
  it('renders the overview page and product cards', () => {
    (useValues as jest.Mock).mockReturnValue({ errorConnecting: false });
    (useContext as jest.Mock).mockImplementationOnce(() => ({ config: { host: 'localhost' } }));
    const wrapper = shallow(<ProductSelector />);

    expect(wrapper.find(EuiPage).hasClass('enterpriseSearchOverview')).toBe(true);
    expect(wrapper.find(ProductCard)).toHaveLength(2);
  });
});
