/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import React from 'react';
import { ThemeProvider } from 'styled-components';

import { getMockTheme } from '../../../../../../common/lib/kibana/kibana_react.mock';
import { getDetectionAlertFieldsMock } from '../../../../../../common/mock';
import { ThreatMatchRow } from './threat_match_row';

describe('threatMatchRow', () => {
  let threatMatchFields: ReturnType<typeof getDetectionAlertFieldsMock>;
  let mockTheme: ReturnType<typeof getMockTheme>;

  beforeEach(() => {
    mockTheme = getMockTheme({ eui: { paddingSizes: {} } });
    threatMatchFields = getDetectionAlertFieldsMock([
      { field: 'threat.indicator.matched.type', value: ['url'] },
    ]);
  });

  it('renders an indicator match alert', () => {
    const wrapper = mount(
      <ThemeProvider theme={mockTheme}>
        <ThreatMatchRow fields={threatMatchFields} />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="threat-match-row"]').exists()).toEqual(true);
  });
});
