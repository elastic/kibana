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

import { Credentials } from './credentials';
import { EuiPageContentBody } from '@elastic/eui';
import { CredentialsFlyout } from './credentials_flyout';

describe('Credentials', () => {
  const mockKea = ({ values = {}, actions = {} }) => {
    const mergedValues = {
      apiUrl: 'http://www.example.com',
      dataLoading: false,
      showCredentialsForm: false,
      ...values,
    };

    const mergedActions = {
      initializeCredentialsData: jest.fn,
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
    const wrapper = shallow(<Credentials />);
    expect(wrapper.find(EuiPageContentBody)).toHaveLength(1);
  });

  it('initializes data on mount', () => {
    const initializeCredentialsData = jest.fn();
    mockKea({ actions: { initializeCredentialsData } });
    const wrapper = shallow(<Credentials />);
    expect(initializeCredentialsData).toHaveBeenCalledTimes(1);
  });

  it('renders nothing if data is still oading', () => {
    mockKea({ values: { dataLoading: true } });
    const wrapper = shallow(<Credentials />);
    expect(wrapper.find(EuiPageContentBody)).toHaveLength(0);
  });

  it('will render CredentialsFlyout if showCredentialsForm is true', () => {
    mockKea({ values: { showCredentialsForm: true } });
    const wrapper = shallow(<Credentials />);
    expect(wrapper.find(CredentialsFlyout)).toHaveLength(1);
  });

  it('will NOT render CredentialsFlyout if showCredentialsForm is false', () => {
    mockKea({ values: { showCredentialsForm: false } });
    const wrapper = shallow(<Credentials />);
    expect(wrapper.find(CredentialsFlyout)).toHaveLength(0);
  });
});
