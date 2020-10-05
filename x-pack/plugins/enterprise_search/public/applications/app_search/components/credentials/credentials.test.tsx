/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import '../../../__mocks__/kea.mock';
import '../../../__mocks__/shallow_useeffect.mock';

import React, { useEffect } from 'react';
import { shallow } from 'enzyme';
import { useValues, useActions } from 'kea';

import { Credentials } from './credentials';
import { EuiCopy, EuiLoadingContent, EuiPageContentBody } from '@elastic/eui';
import { CredentialsFlyout } from './credentials_flyout';

import { externalUrl } from '../../../shared/enterprise_search_url';

const getUseEffectUnmountHandler = () => (useEffect as jest.Mock).mock.calls[0][0]();

describe('Credentials', () => {
  const mockKea = ({ values = {}, actions = {} }) => {
    const mergedValues = {
      dataLoading: false,
      shouldShowCredentialsForm: false,
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
    shallow(<Credentials />);
    expect(initializeCredentialsData).toHaveBeenCalledTimes(1);
  });

  it('calls resetCredentials on unmount', () => {
    const resetCredentials = jest.fn();
    mockKea({ actions: { resetCredentials } });
    shallow(<Credentials />);
    const unmountHandler = getUseEffectUnmountHandler();
    unmountHandler();
    expect(resetCredentials).toHaveBeenCalledTimes(1);
  });

  it('renders a limited UI if data is still loading', () => {
    mockKea({ values: { dataLoading: true } });
    const wrapper = shallow(<Credentials />);
    expect(wrapper.find('[data-test-subj="CreateAPIKeyButton"]')).toHaveLength(0);
    expect(wrapper.find(EuiLoadingContent)).toHaveLength(2);
  });

  it('renders the API endpoint and a button to copy it', () => {
    externalUrl.enterpriseSearchUrl = 'http://localhost:3002';
    mockKea({});
    const copyMock = jest.fn();
    const wrapper = shallow(<Credentials />);
    const copyEl = shallow(wrapper.find(EuiCopy).props().children(copyMock));
    expect(copyEl.find('EuiButtonIcon').props().onClick).toEqual(copyMock);
    expect(copyEl.find('span').text()).toEqual('http://localhost:3002');
  });

  it('will show the Crendentials Flyout when the Create API Key button is pressed', () => {
    const showCredentialsForm = jest.fn();
    mockKea({ actions: { showCredentialsForm } });
    const wrapper = shallow(<Credentials />);
    const button: any = wrapper.find('[data-test-subj="CreateAPIKeyButton"]');
    button.props().onClick();
    expect(showCredentialsForm).toHaveBeenCalledTimes(1);
  });

  it('will render CredentialsFlyout if shouldShowCredentialsForm is true', () => {
    mockKea({ values: { shouldShowCredentialsForm: true } });
    const wrapper = shallow(<Credentials />);
    expect(wrapper.find(CredentialsFlyout)).toHaveLength(1);
  });

  it('will NOT render CredentialsFlyout if shouldShowCredentialsForm is false', () => {
    mockKea({ values: { shouldShowCredentialsForm: false } });
    const wrapper = shallow(<Credentials />);
    expect(wrapper.find(CredentialsFlyout)).toHaveLength(0);
  });
});
