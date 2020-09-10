/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import '../../../__mocks__/shallow_usecontext.mock';
import '../../../__mocks__/kea.mock';

import React from 'react';
import { shallow } from 'enzyme';
import { useValues, useActions } from 'kea';

import { PRIVATE } from '../../constants/credentials';

import { CredentialsFlyout } from './credentials_flyout';
import { EuiFlyout } from '@elastic/eui';
import { IApiToken } from '../../../../../common/types/app_search';

describe('Credentials', () => {
  const apiToken: IApiToken = {
    name: '',
    type: PRIVATE,
    read: true,
    write: true,
    access_all_engines: true,
  };

  const mockKea = ({ values = {}, actions = {} }) => {
    const mergedValues = {
      activeApiToken: apiToken,
      activeApiTokenIsExisting: false,
      ...values,
    };

    const mergedActions = {
      hideCredentialsForm: jest.fn,
      ...actions,
    };

    (useValues as jest.Mock).mockImplementationOnce(() => mergedValues);
    (useActions as jest.Mock).mockImplementationOnce(() => mergedActions);
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders', () => {
    mockKea({});
    const wrapper = shallow(<CredentialsFlyout />);
    expect(wrapper.find(EuiFlyout)).toHaveLength(1);
  });
});
