/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import '../../../__mocks__/kea.mock';
import { unmountHandler } from '../../../__mocks__/shallow_useeffect.mock';

import React from 'react';
import { shallow } from 'enzyme';
import { useValues, useActions } from 'kea';

import { Credentials } from './credentials';
import { EuiCopy, EuiPageContentBody } from '@elastic/eui';

import { externalUrl } from '../../../shared/enterprise_search_url';

describe('Credentials', () => {
  const mockKea = ({ values = {}, actions = {} }) => {
    const mergedValues = {
      dataLoading: false,
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
    unmountHandler();
    expect(resetCredentials).toHaveBeenCalledTimes(1);
  });

  it('renders nothing if data is still loading', () => {
    mockKea({ values: { dataLoading: true } });
    const wrapper = shallow(<Credentials />);
    expect(wrapper.find(EuiPageContentBody)).toHaveLength(0);
  });

  it('renders the API endpoint and a button to copy it', () => {
    externalUrl.enterpriseSearchUrl = 'http://localhost:3002';
    mockKea({});
    const copyMock = jest.fn();
    const wrapper = shallow(<Credentials />);
    // We wrap children in a div so that `shallow` can render it.
    const copyEl = shallow(<div>{wrapper.find(EuiCopy).props().children(copyMock)}</div>);
    expect(copyEl.find('EuiButtonIcon').props().onClick).toEqual(copyMock);
    expect(copyEl.text().replace('<EuiButtonIcon />', '')).toEqual('http://localhost:3002');
  });

  it('will show the Crendentials Flyout when the Create API Key button is pressed', () => {
    const showCredentialsForm = jest.fn();
    mockKea({ actions: { showCredentialsForm } });
    const wrapper = shallow(<Credentials />);
    const button: any = wrapper.find('[data-test-subj="CreateAPIKeyButton"]');
    button.props().onClick();
    expect(showCredentialsForm).toHaveBeenCalledTimes(1);
  });
});
