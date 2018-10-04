/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { shallow } from 'enzyme';
import React from 'react';
import { AdvancedSettingsSubtitle } from './advanced_settings_subtitle';

describe('AdvancedSettingsSubtitle', () => {
  it('renders as expected', () => {
    const space = {
      id: 'my-space',
      name: 'My Space',
    };
    expect(shallow(<AdvancedSettingsSubtitle space={space} />)).toMatchSnapshot();
  });
});
