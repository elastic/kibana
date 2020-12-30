/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import React from 'react';

import { useUiSetting$ } from '../../lib/kibana';

import { PreferenceFormattedBytesComponent } from '.';

jest.mock('../../lib/kibana');
const mockUseUiSetting$ = useUiSetting$ as jest.Mock;

const DEFAULT_BYTES_FORMAT_VALUE = '0,0.[0]b'; // kibana's default for this setting
const bytes = '2806422';

describe('PreferenceFormattedBytes', () => {
  test('renders correctly against snapshot', () => {
    mockUseUiSetting$.mockImplementation(() => [DEFAULT_BYTES_FORMAT_VALUE]);
    const wrapper = shallow(<PreferenceFormattedBytesComponent value={bytes} />);

    expect(wrapper).toMatchSnapshot();
  });

  test('it renders bytes to Numeral formatting when no format setting exists', () => {
    mockUseUiSetting$.mockImplementation(() => [null]);
    const wrapper = mount(<PreferenceFormattedBytesComponent value={bytes} />);

    expect(wrapper.text()).toEqual('2,806,422');
  });

  test('it renders bytes according to the default format', () => {
    mockUseUiSetting$.mockImplementation(() => [DEFAULT_BYTES_FORMAT_VALUE]);
    const wrapper = mount(<PreferenceFormattedBytesComponent value={bytes} />);

    expect(wrapper.text()).toEqual('2.7MB');
  });

  test('it renders bytes supplied as a number according to the default format', () => {
    mockUseUiSetting$.mockImplementation(() => [DEFAULT_BYTES_FORMAT_VALUE]);
    const wrapper = mount(<PreferenceFormattedBytesComponent value={+bytes} />);

    expect(wrapper.text()).toEqual('2.7MB');
  });

  test('it renders bytes according to new format', () => {
    mockUseUiSetting$.mockImplementation(() => ['0b']);
    const wrapper = mount(<PreferenceFormattedBytesComponent value={bytes} />);

    expect(wrapper.text()).toEqual('3MB');
  });
});
