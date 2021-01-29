/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { setMockValues, setMockActions } from '../../../../__mocks__/kea.mock';

import React from 'react';
import { shallow } from 'enzyme';
import { EuiFlyoutBody, EuiForm } from '@elastic/eui';

import { ApiTokenTypes } from '../constants';
import { defaultApiToken } from '../credentials_logic';

import {
  FormKeyName,
  FormKeyType,
  FormKeyReadWriteAccess,
  FormKeyEngineAccess,
  FormKeyUpdateWarning,
} from './form_components';
import { CredentialsFlyoutBody } from './body';

describe('CredentialsFlyoutBody', () => {
  const values = {
    activeApiToken: defaultApiToken,
    activeApiTokenExists: false,
  };
  const actions = {
    onApiTokenChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(values);
    setMockActions(actions);
  });

  it('renders', () => {
    const wrapper = shallow(<CredentialsFlyoutBody />);

    expect(wrapper.find(EuiFlyoutBody)).toHaveLength(1);
    expect(wrapper.find(EuiForm)).toHaveLength(1);
  });

  it('shows the expected form components on default private key creation', () => {
    const wrapper = shallow(<CredentialsFlyoutBody />);

    expect(wrapper.find(FormKeyName)).toHaveLength(1);
    expect(wrapper.find(FormKeyType)).toHaveLength(1);
    expect(wrapper.find(FormKeyReadWriteAccess)).toHaveLength(1);
    expect(wrapper.find(FormKeyEngineAccess)).toHaveLength(1);
    expect(wrapper.find(FormKeyUpdateWarning)).toHaveLength(0);
  });

  it('does not show read-write access options for search keys', () => {
    setMockValues({
      ...values,
      activeApiToken: {
        ...defaultApiToken,
        type: ApiTokenTypes.Search,
      },
    });
    const wrapper = shallow(<CredentialsFlyoutBody />);

    expect(wrapper.find(FormKeyReadWriteAccess)).toHaveLength(0);
    expect(wrapper.find(FormKeyEngineAccess)).toHaveLength(1);
  });

  it('does not show read-write or engine access options for admin keys', () => {
    setMockValues({
      ...values,
      activeApiToken: {
        ...defaultApiToken,
        type: ApiTokenTypes.Admin,
      },
    });
    const wrapper = shallow(<CredentialsFlyoutBody />);

    expect(wrapper.find(FormKeyReadWriteAccess)).toHaveLength(0);
    expect(wrapper.find(FormKeyEngineAccess)).toHaveLength(0);
  });

  it('shows a warning if updating an existing key', () => {
    setMockValues({ ...values, activeApiTokenExists: true });
    const wrapper = shallow(<CredentialsFlyoutBody />);

    expect(wrapper.find(FormKeyUpdateWarning)).toHaveLength(1);
  });

  it('calls onApiTokenChange on form submit', () => {
    const wrapper = shallow(<CredentialsFlyoutBody />);

    const preventDefault = jest.fn();
    wrapper.find(EuiForm).simulate('submit', { preventDefault });

    expect(preventDefault).toHaveBeenCalled();
    expect(actions.onApiTokenChange).toHaveBeenCalled();
  });
});
