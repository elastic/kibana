/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../../__mocks__/react_router';
import '../../../__mocks__/engine_logic.mock';

import { setMockActions, setMockValues } from '../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import { EuiSwitch } from '@elastic/eui';

import { mountWithIntl } from '@kbn/test/jest';

import { CurationsSettings } from './curations_settings';

const MOCK_VALUES = {
  dataLoading: false,
  curationsSettings: {
    enabled: true,
    mode: 'automatic',
  },
};

const MOCK_ACTIONS = {
  loadCurationsSettings: jest.fn(),
  toggleCurationsEnabled: jest.fn(),
  toggleCurationsMode: jest.fn(),
};

describe('CurationsSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setMockActions(MOCK_ACTIONS);
  });

  it('loads curations settings on load', () => {
    setMockValues(MOCK_VALUES);
    mountWithIntl(<CurationsSettings />);

    expect(MOCK_ACTIONS.loadCurationsSettings).toHaveBeenCalledTimes(1);
  });

  it('contains a switch to toggle curations settings', () => {
    let wrapper: ShallowWrapper;

    setMockValues({
      ...MOCK_VALUES,
      curationsSettings: { ...MOCK_VALUES.curationsSettings, enabled: true },
    });
    wrapper = shallow(<CurationsSettings />);

    expect(wrapper.find(EuiSwitch).at(0).prop('checked')).toBe(true);

    setMockValues({
      ...MOCK_VALUES,
      curationsSettings: { ...MOCK_VALUES.curationsSettings, enabled: false },
    });
    wrapper = shallow(<CurationsSettings />);

    expect(wrapper.find(EuiSwitch).at(0).prop('checked')).toBe(false);

    wrapper.find(EuiSwitch).at(0).simulate('change');
    expect(MOCK_ACTIONS.toggleCurationsEnabled).toHaveBeenCalled();
  });

  it('contains a switch to toggle the curations mode', () => {
    let wrapper: ShallowWrapper;

    setMockValues({
      ...MOCK_VALUES,
      curationsSettings: { ...MOCK_VALUES.curationsSettings, mode: 'automated' },
    });
    wrapper = shallow(<CurationsSettings />);

    expect(wrapper.find(EuiSwitch).at(1).prop('checked')).toBe(true);

    setMockValues({
      ...MOCK_VALUES,
      curationsSettings: { ...MOCK_VALUES.curationsSettings, mode: 'manual' },
    });
    wrapper = shallow(<CurationsSettings />);

    expect(wrapper.find(EuiSwitch).at(1).prop('checked')).toBe(false);

    wrapper.find(EuiSwitch).at(1).simulate('change');
    expect(MOCK_ACTIONS.toggleCurationsMode).toHaveBeenCalled();
  });

  it('disable both switches when data is loading', () => {
    setMockValues({
      ...MOCK_VALUES,
      dataLoading: true,
    });
    const wrapper = shallow(<CurationsSettings />);

    expect(wrapper.find(EuiSwitch).at(0).prop('disabled')).toBe(true);
    expect(wrapper.find(EuiSwitch).at(1).prop('disabled')).toBe(true);
  });

  it('enables both switches when data is done loading', () => {
    setMockValues({
      ...MOCK_VALUES,
      dataLoading: false,
    });
    const wrapper = shallow(<CurationsSettings />);

    expect(wrapper.find(EuiSwitch).at(0).prop('disabled')).toBe(false);
    expect(wrapper.find(EuiSwitch).at(1).prop('disabled')).toBe(false);
  });
});
