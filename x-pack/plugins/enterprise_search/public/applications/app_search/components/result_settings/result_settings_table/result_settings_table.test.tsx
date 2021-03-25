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
import { ResultSettingsNonTextFieldsBody } from './result_settings_non_text_fields_body';
import { ResultSettingsTable } from './result_settings_table';
import { ResultSettingsTextFieldsBody } from './result_settings_text_fields_body';

describe('ResultSettingsTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues({
      textResultFields: { foo: { raw: true, rawSize: 5, snippet: false, snippetFallback: false } },
      nonTextResultFields: {
        bar: { raw: true, rawSize: 5, snippet: false, snippetFallback: false },
      },
      schemaConflicts: {
        foo: {
          text: ['foo'],
          number: ['foo'],
          geolocation: [],
          date: [],
        },
      },
    });
  });

  it('renders', () => {
    const wrapper = shallow(<ResultSettingsTable />);
    expect(wrapper.find(ResultSettingsTextFieldsBody).exists()).toBe(true);
    expect(wrapper.find(ResultSettingsNonTextFieldsBody).exists()).toBe(true);
    expect(wrapper.find(ResultSettingsDisabledFieldsHeader).exists()).toBe(true);
  });

  it('will hide sections that have no data avialble to show', () => {
    setMockValues({
      textResultFields: {},
      nonTextResultFields: {},
      schemaConflicts: {},
    });

    const wrapper = shallow(<ResultSettingsTable />);
    expect(wrapper.find(ResultSettingsTextFieldsBody).exists()).toBe(false);
    expect(wrapper.find(ResultSettingsNonTextFieldsBody).exists()).toBe(false);
    expect(wrapper.find(ResultSettingsDisabledFieldsHeader).exists()).toBe(false);
  });
});
