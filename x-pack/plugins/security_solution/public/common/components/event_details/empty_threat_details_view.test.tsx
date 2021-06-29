/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ThemeProvider } from 'styled-components';

import { useMountAppended } from '../../utils/use_mount_appended';
import { getMockTheme } from '../../lib/kibana/kibana_react.mock';
import { EmptyThreatDetailsView } from './empty_threat_details_view';

jest.mock('../../lib/kibana');

describe('EmptyThreatDetailsView', () => {
  const mount = useMountAppended();
  const mockTheme = getMockTheme({
    eui: {
      euiBreakpoints: {
        l: '1200px',
      },
      paddingSizes: {
        m: '8px',
        xl: '32px',
      },
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders correct items', () => {
    const wrapper = mount(
      <ThemeProvider theme={mockTheme}>
        <EmptyThreatDetailsView />
      </ThemeProvider>
    );
    expect(wrapper.find('[data-test-subj="empty-threat-details-view"]').exists()).toEqual(true);
  });

  test('renders link to docs', () => {
    const wrapper = mount(
      <ThemeProvider theme={mockTheme}>
        <EmptyThreatDetailsView />
      </ThemeProvider>
    );
    expect(wrapper.find('a').exists()).toEqual(true);
  });
});
