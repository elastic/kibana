/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { setMockValues } from '../../../../__mocks__/kea.mock';

import React from 'react';
import { shallow } from 'enzyme';
import { EuiFlyoutHeader } from '@elastic/eui';

import { ApiTokenTypes } from '../constants';
import { ApiToken } from '../types';

import { CredentialsFlyoutHeader } from './header';

describe('CredentialsFlyoutHeader', () => {
  const apiToken: ApiToken = {
    name: '',
    type: ApiTokenTypes.Private,
    read: true,
    write: true,
    access_all_engines: true,
  };
  const values = {
    activeApiToken: apiToken,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(values);
  });

  it('renders', () => {
    const wrapper = shallow(<CredentialsFlyoutHeader />);

    expect(wrapper.find(EuiFlyoutHeader)).toHaveLength(1);
    expect(wrapper.find('h2').prop('id')).toEqual('credentialsFlyoutTitle');
    expect(wrapper.find('h2').prop('children')).toEqual('Create a new key');
  });

  it('changes the title text if editing an existing token', () => {
    setMockValues({
      activeApiToken: {
        ...apiToken,
        id: 'some-id',
        name: 'search-key',
      },
    });
    const wrapper = shallow(<CredentialsFlyoutHeader />);

    expect(wrapper.find('h2').prop('children')).toEqual('Update search-key');
  });
});
