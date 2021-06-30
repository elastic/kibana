/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ThemeProvider } from 'styled-components';

import { useMountAppended } from '../../../utils/use_mount_appended';
import { getMockTheme } from '../../../lib/kibana/kibana_react.mock';
import { NoInvestigationEnrichmentsPanel } from './no_investigation_enrichments_panel';
import * as i18n from './translations';
import { RangeCallback } from './enrichment_range_picker';

describe('NoInvestigationEnrichmentsPanel', () => {
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

  it('renders expected copy', () => {
    const onRangeChange = jest.fn();
    const wrapper = mount(
      <ThemeProvider theme={mockTheme}>
        <NoInvestigationEnrichmentsPanel onRangeChange={onRangeChange} />
      </ThemeProvider>
    );

    expect(
      wrapper.find('[data-test-subj="no-investigation-enrichments-panel"]').hostNodes().text()
    ).toContain(i18n.NO_INVESTIGATION_ENRICHMENTS_DESCRIPTION);
  });

  it('invokes the onRangeChange handler when dates are changed', () => {
    const onRangeChange = jest.fn();
    const wrapper = mount(
      <ThemeProvider theme={mockTheme}>
        <NoInvestigationEnrichmentsPanel onRangeChange={onRangeChange} />
      </ThemeProvider>
    );
    wrapper
      .find('[data-test-subj="change-enrichment-lookback-query-button"]')
      .first()
      .simulate('click');
    const onChangeInternal = (wrapper
      .find('EnrichmentRangePicker')
      .first()
      .invoke('onChange') as unknown) as RangeCallback;
    if (onChangeInternal) {
      onChangeInternal({ from: '2020', to: '2021' });
    }

    expect(onRangeChange).toHaveBeenCalledWith({ from: '2020', to: '2021' });
  });
});
