/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues, setMockActions } from '../../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiCheckbox } from '@elastic/eui';

import { FormKeyReadWriteAccess } from '.';

describe('FormKeyReadWriteAccess', () => {
  const values = {
    activeApiToken: { read: false, write: false },
  };
  const actions = {
    setTokenReadWrite: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(values);
    setMockActions(actions);
  });

  it('renders', () => {
    const wrapper = shallow(<FormKeyReadWriteAccess />);

    expect(wrapper.find('h3').text()).toEqual('Read and Write Access Levels');
    expect(wrapper.find(EuiCheckbox)).toHaveLength(2);
  });

  it('controls the checked state for the read checkbox', () => {
    setMockValues({
      ...values,
      activeApiToken: { read: true, write: false },
    });
    const wrapper = shallow(<FormKeyReadWriteAccess />);

    expect(wrapper.find('#read').prop('checked')).toEqual(true);
    expect(wrapper.find('#write').prop('checked')).toEqual(false);
  });

  it('controls the checked state for the write checkbox', () => {
    setMockValues({
      ...values,
      activeApiToken: { read: false, write: true },
    });
    const wrapper = shallow(<FormKeyReadWriteAccess />);

    expect(wrapper.find('#read').prop('checked')).toEqual(false);
    expect(wrapper.find('#write').prop('checked')).toEqual(true);
  });

  it('calls setTokenReadWrite when the checkboxes are changed', () => {
    const wrapper = shallow(<FormKeyReadWriteAccess />);

    wrapper.find('#read').simulate('change', { target: { name: 'read', checked: true } });
    expect(actions.setTokenReadWrite).toHaveBeenCalledWith({ name: 'read', checked: true });

    wrapper.find('#write').simulate('change', { target: { name: 'write', checked: false } });
    expect(actions.setTokenReadWrite).toHaveBeenCalledWith({ name: 'write', checked: false });
  });
});
