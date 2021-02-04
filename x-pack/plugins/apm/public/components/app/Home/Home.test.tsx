/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { Home } from '../Home';
import { MockApmPluginContextWrapper } from '../../../context/apm_plugin/mock_apm_plugin_context';

describe('Home component', () => {
  it('should render services', () => {
    expect(
      shallow(
        <MockApmPluginContextWrapper>
          <Home tab="services" />
        </MockApmPluginContextWrapper>
      )
    ).toMatchSnapshot();
  });

  it('should render traces', () => {
    expect(
      shallow(
        <MockApmPluginContextWrapper>
          <Home tab="traces" />
        </MockApmPluginContextWrapper>
      )
    ).toMatchSnapshot();
  });
});
