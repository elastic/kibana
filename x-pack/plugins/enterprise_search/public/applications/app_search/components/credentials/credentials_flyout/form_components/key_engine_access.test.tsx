/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { setMockValues, setMockActions } from '../../../../../__mocks__/kea.mock';

import React from 'react';
import { shallow } from 'enzyme';
import { EuiRadio, EuiCheckbox } from '@elastic/eui';

import { FormKeyEngineAccess, EngineSelection } from './key_engine_access';

describe('FormKeyEngineAccess', () => {
  const values = {
    myRole: { canAccessAllEngines: true },
    fullEngineAccessChecked: true,
  };
  const actions = {
    setAccessAllEngines: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(values);
    setMockActions(actions);
  });

  it('renders', () => {
    const wrapper = shallow(<FormKeyEngineAccess />);

    expect(wrapper.find(EuiRadio)).toHaveLength(2);
    expect(wrapper.find(EngineSelection)).toHaveLength(0);
  });

  it('hides the full access radio option if the user does not have access to all engines', () => {
    setMockValues({
      ...values,
      myRole: { canAccessAllEngines: false },
    });
    const wrapper = shallow(<FormKeyEngineAccess />);

    expect(wrapper.find('#all_engines').prop('hidden')).toEqual(true);
  });

  it('controls the checked values for access radios', () => {
    setMockValues({
      ...values,
      fullEngineAccessChecked: true,
    });
    const wrapper = shallow(<FormKeyEngineAccess />);

    expect(wrapper.find('#all_engines').prop('checked')).toEqual(true);
    expect(wrapper.find('#all_engines').prop('value')).toEqual('true');
    expect(wrapper.find('#specific_engines').prop('checked')).toEqual(false);
    expect(wrapper.find('#specific_engines').prop('value')).toEqual('false');

    setMockValues({
      ...values,
      fullEngineAccessChecked: false,
    });
    wrapper.setProps({}); // Re-render

    expect(wrapper.find('#all_engines').prop('checked')).toEqual(false);
    expect(wrapper.find('#all_engines').prop('value')).toEqual('false');
    expect(wrapper.find('#specific_engines').prop('checked')).toEqual(true);
    expect(wrapper.find('#specific_engines').prop('value')).toEqual('true');
  });

  it('calls setAccessAllEngines when the radios are changed', () => {
    const wrapper = shallow(<FormKeyEngineAccess />);

    wrapper.find('#all_engines').simulate('change');
    expect(actions.setAccessAllEngines).toHaveBeenCalledWith(true);

    wrapper.find('#specific_engines').simulate('change');
    expect(actions.setAccessAllEngines).toHaveBeenCalledWith(false);
  });

  it('displays the engine selection panel if the limited access radio is selected', () => {
    setMockValues({
      ...values,
      fullEngineAccessChecked: false,
    });
    const wrapper = shallow(<FormKeyEngineAccess />);

    expect(wrapper.find(EngineSelection)).toHaveLength(1);
  });
});

describe('EngineSelection', () => {
  const values = {
    activeApiToken: { engines: [] },
    engines: [{ name: 'engine1' }, { name: 'engine2' }, { name: 'engine3' }],
  };
  const actions = {
    onEngineSelect: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(values);
    setMockActions(actions);
  });

  it('renders', () => {
    const wrapper = shallow(<EngineSelection />);

    expect(wrapper.find('h4').text()).toEqual('Select Engines');
    expect(wrapper.find(EuiCheckbox)).toHaveLength(3);
    expect(wrapper.find(EuiCheckbox).first().prop('label')).toEqual('engine1');
  });

  it('controls the engines checked state', () => {
    setMockValues({
      ...values,
      activeApiToken: { engines: ['engine3'] },
    });
    const wrapper = shallow(<EngineSelection />);

    expect(wrapper.find(EuiCheckbox).first().prop('checked')).toEqual(false);
    expect(wrapper.find(EuiCheckbox).last().prop('checked')).toEqual(true);
  });

  it('calls onEngineSelect when the checkboxes are changed', () => {
    const wrapper = shallow(<EngineSelection />);

    wrapper.find(EuiCheckbox).first().simulate('change');
    expect(actions.onEngineSelect).toHaveBeenCalledWith('engine1');

    wrapper.find(EuiCheckbox).last().simulate('change');
    expect(actions.onEngineSelect).toHaveBeenCalledWith('engine3');
  });
});
