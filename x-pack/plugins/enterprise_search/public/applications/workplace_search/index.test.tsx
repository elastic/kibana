/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../__mocks__/shallow_usecontext.mock';
import '../__mocks__/kea.mock';

import React, { useContext } from 'react';
import { Redirect } from 'react-router-dom';
import { shallow } from 'enzyme';
import { useValues } from 'kea';

import { Overview } from './views/overview';
import { ErrorState } from './views/error_state';

import { WorkplaceSearch } from './';

describe('Workplace Search', () => {
  it('redirects to Setup Guide when enterpriseSearchUrl is not set', () => {
    (useContext as jest.Mock).mockImplementationOnce(() => ({
      config: { host: '' },
    }));
    const wrapper = shallow(<WorkplaceSearch />);

    expect(wrapper.find(Redirect)).toHaveLength(1);
    expect(wrapper.find(Overview)).toHaveLength(0);
  });

  it('renders the Overview when enterpriseSearchUrl is set', () => {
    (useContext as jest.Mock).mockImplementationOnce(() => ({
      config: { host: 'https://foo.bar' },
    }));
    const wrapper = shallow(<WorkplaceSearch />);

    expect(wrapper.find(Overview)).toHaveLength(1);
    expect(wrapper.find(Redirect)).toHaveLength(0);
  });

  it('renders ErrorState when the app cannot connect to Enterprise Search', () => {
    (useValues as jest.Mock).mockImplementationOnce(() => ({ errorConnecting: true }));
    const wrapper = shallow(<WorkplaceSearch />);

    expect(wrapper.find(ErrorState).exists()).toBe(true);
    expect(wrapper.find(Overview)).toHaveLength(0);
  });
});
