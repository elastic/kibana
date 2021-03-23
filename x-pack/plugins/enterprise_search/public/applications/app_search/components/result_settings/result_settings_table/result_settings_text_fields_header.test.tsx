/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { ResultSettingsTextFieldsHeader } from './result_settings_text_fields_header';

describe('ResultSettingsTextFieldsHeader', () => {
  it('renders', () => {
    const wrapper = shallow(<ResultSettingsTextFieldsHeader />);
    expect(wrapper.isEmptyRender()).toBe(false);
  });
});
