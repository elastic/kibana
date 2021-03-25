/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues, setMockActions } from '../../../../__mocks__/kea.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { ResultSettingsDisabledFieldsHeader } from './result_settings_disabled_fields_header';
import { ResultSettingsTable } from './result_settings_table';

describe('ResultSettingsTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues({
      schemaConflicts: {},
    });
  });

  it('renders', () => {
    const wrapper = shallow(<ResultSettingsTable />);
    expect(wrapper.isEmptyRender()).toBe(false);
    expect(wrapper.find(ResultSettingsDisabledFieldsHeader).exists()).toBe(false);
  });

  it('renders a disabled fields section if there are schema conflicts', () => {
    setMockValues({
      schemaConflicts: {
        foo: {
          text: ['foo'],
          number: ['foo'],
          geolocation: [],
          date: [],
        },
      },
    });

    const wrapper = shallow(<ResultSettingsTable />);
    expect(wrapper.find(ResultSettingsDisabledFieldsHeader).exists()).toBe(true);
  });
});
