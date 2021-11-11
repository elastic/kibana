/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { shallow } from 'enzyme';
import { ServiceNodeMetrics } from '.';
import { MockApmPluginContextWrapper } from '../../../context/apm_plugin/mock_apm_plugin_context';

describe('ServiceNodeMetrics', () => {
  it('renders', () => {
    expect(() =>
      render(
        <MockApmPluginContextWrapper>
          <ServiceNodeMetrics />
        </MockApmPluginContextWrapper>
      )
    ).not.toThrowError();
  });
});
