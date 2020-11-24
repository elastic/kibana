/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { setMockValues, setMockActions } from '../../../__mocks__/kea.mock';
import { unmountHandler } from '../../../__mocks__/shallow_useeffect.mock';

import React from 'react';
import { shallow } from 'enzyme';

import { Credentials } from './credentials';
import { EuiCopy, EuiLoadingContent, EuiPageContentBody } from '@elastic/eui';

import { externalUrl } from '../../../shared/enterprise_search_url';
import { CredentialsFlyout } from './credentials_flyout';

describe('Credentials', () => {
  // Kea mocks
  const values = {
    dataLoading: false,
  };
  const actions = {
    initializeCredentialsData: jest.fn(),
    resetCredentials: jest.fn(),
    showCredentialsForm: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(values);
    setMockActions(actions);
  });

  it('renders', () => {
    const wrapper = shallow(<Credentials />);
    expect(wrapper.find(EuiPageContentBody)).toHaveLength(1);
  });

  it('initializes data on mount', () => {
    shallow(<Credentials />);
    expect(actions.initializeCredentialsData).toHaveBeenCalledTimes(1);
  });

  it('calls resetCredentials on unmount', () => {
    shallow(<Credentials />);
    unmountHandler();
    expect(actions.resetCredentials).toHaveBeenCalledTimes(1);
  });

  it('renders a limited UI if data is still loading', () => {
    setMockValues({ dataLoading: true });
    const wrapper = shallow(<Credentials />);
    expect(wrapper.find('[data-test-subj="CreateAPIKeyButton"]')).toHaveLength(0);
    expect(wrapper.find(EuiLoadingContent)).toHaveLength(1);
  });

  it('renders the API endpoint and a button to copy it', () => {
    externalUrl.enterpriseSearchUrl = 'http://localhost:3002';
    const copyMock = jest.fn();
    const wrapper = shallow(<Credentials />);
    // We wrap children in a div so that `shallow` can render it.
    const copyEl = shallow(<div>{wrapper.find(EuiCopy).props().children(copyMock)}</div>);
    expect(copyEl.find('EuiButtonIcon').props().onClick).toEqual(copyMock);
    expect(copyEl.text().replace('<EuiButtonIcon />', '')).toEqual('http://localhost:3002');
  });

  it('will show the Crendentials Flyout when the Create API Key button is pressed', () => {
    const wrapper = shallow(<Credentials />);
    const button: any = wrapper.find('[data-test-subj="CreateAPIKeyButton"]');
    button.props().onClick();
    expect(actions.showCredentialsForm).toHaveBeenCalledTimes(1);
  });

  it('will render CredentialsFlyout if shouldShowCredentialsForm is true', () => {
    setMockValues({ shouldShowCredentialsForm: true });
    const wrapper = shallow(<Credentials />);
    expect(wrapper.find(CredentialsFlyout)).toHaveLength(1);
  });

  it('will NOT render CredentialsFlyout if shouldShowCredentialsForm is false', () => {
    setMockValues({ shouldShowCredentialsForm: false });
    const wrapper = shallow(<Credentials />);
    expect(wrapper.find(CredentialsFlyout)).toHaveLength(0);
  });
});
