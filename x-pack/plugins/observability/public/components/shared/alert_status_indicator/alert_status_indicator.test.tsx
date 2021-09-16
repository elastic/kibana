/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow } from 'enzyme';
import lightTheme from '@elastic/eui/dist/eui_theme_light.json';
import * as ThemeHook from '../../../hooks/use_theme';
import { AlertStatusIndicator } from './alert_status_indicator';
import { mockHook } from '../../../utils/test_helper';

describe('AlertStatusIndicator', () => {
  it('should render correctly when active', async () => {
    expect(shallow(<AlertStatusIndicator alertStatus={'active'} />)).toMatchInlineSnapshot(`
      <EuiHealth
        color="primary"
        textSize="xs"
      >
        Active
      </EuiHealth>
    `);
  });

  it('should render correctly when recovered', async () => {
    const mockThemeContext = {
      eui: lightTheme,
      darkMode: false,
    };
    mockHook([ThemeHook, 'useTheme'], () => mockThemeContext);

    expect(shallow(<AlertStatusIndicator alertStatus={'recovered'} />)).toMatchInlineSnapshot(`
      <EuiHealth
        color="#d3dae6"
        textSize="xs"
      >
        <EuiText
          color="subdued"
          size="relative"
        >
          Recovered
        </EuiText>
      </EuiHealth>
    `);
  });
});
