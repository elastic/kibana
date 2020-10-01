/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { setMockValues, setMockActions } from '../../../__mocks__/kea.mock';

import React from 'react';
import { shallow } from 'enzyme';

import { CredentialsFlyout } from './credentials_flyout';
import { EuiFlyout } from '@elastic/eui';
import { IApiToken } from './types';
import { ApiTokenTypes } from './constants';

describe('Credentials', () => {
  const apiToken: IApiToken = {
    name: '',
    type: ApiTokenTypes.Private,
    read: true,
    write: true,
    access_all_engines: true,
  };

  const values = {
    activeApiToken: apiToken,
    activeApiTokenIsExisting: false,
  };
  const actions = {
    hideCredentialsForm: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(values);
    setMockActions(actions);
  });

  it('renders', () => {
    const wrapper = shallow(<CredentialsFlyout />);
    expect(wrapper.find(EuiFlyout)).toHaveLength(1);
  });
});
