/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { ViewContentHeader } from '../../shared/view_content_header';

import { AccountSettingsSidebar } from './account_settings_sidebar';

describe('AccountSettingsSidebar', () => {
  it('renders', () => {
    const wrapper = shallow(<AccountSettingsSidebar />);

    expect(wrapper.find(ViewContentHeader)).toHaveLength(1);
  });
});
