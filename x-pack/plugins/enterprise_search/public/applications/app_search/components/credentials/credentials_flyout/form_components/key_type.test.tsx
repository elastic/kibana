/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues, setMockActions } from '../../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiSelect } from '@elastic/eui';

import { ApiTokenTypes, TOKEN_TYPE_INFO } from '../../constants';

import { FormKeyType } from '.';

describe('FormKeyType', () => {
  const values = {
    myRole: { credentialTypes: ['search', 'private', 'admin'] },
    activeApiToken: { type: ApiTokenTypes.Private },
    activeApiTokenExists: false,
  };
  const actions = {
    setTokenType: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(values);
    setMockActions(actions);
  });

  it('renders', () => {
    const wrapper = shallow(<FormKeyType />);

    expect(wrapper.find(EuiSelect)).toHaveLength(1);
    expect(wrapper.find(EuiSelect).prop('placeholder')).toEqual('Select a key type');
    expect(wrapper.find(EuiSelect).prop('options')).toEqual(TOKEN_TYPE_INFO);
    expect(wrapper.find(EuiSelect).prop('value')).toEqual(ApiTokenTypes.Private);
    expect(wrapper.find(EuiSelect).prop('disabled')).toEqual(false);
  });

  it('only shows the type options that the user has access to', () => {
    setMockValues({
      ...values,
      myRole: { credentialTypes: ['search'] },
    });
    const wrapper = shallow(<FormKeyType />);

    expect(wrapper.find(EuiSelect).prop('options')).toEqual([
      expect.objectContaining({ value: ApiTokenTypes.Search }),
    ]);
  });

  it('controls the select value', () => {
    setMockValues({
      ...values,
      activeApiToken: { type: ApiTokenTypes.Search },
    });
    const wrapper = shallow(<FormKeyType />);

    expect(wrapper.find(EuiSelect).prop('value')).toEqual(ApiTokenTypes.Search);
  });

  it('disables the select if editing an existing key', () => {
    setMockValues({
      ...values,
      activeApiTokenExists: true,
    });
    const wrapper = shallow(<FormKeyType />);

    expect(wrapper.find(EuiSelect).prop('disabled')).toEqual(true);
  });

  it('calls setTokenType when the select value is changed', () => {
    const wrapper = shallow(<FormKeyType />);
    wrapper.find(EuiSelect).simulate('change', { target: { value: ApiTokenTypes.Admin } });

    expect(actions.setTokenType).toHaveBeenCalledWith(ApiTokenTypes.Admin);
  });
});
