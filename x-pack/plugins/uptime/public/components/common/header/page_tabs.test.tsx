/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '../../../lib/helper/rtl_helpers';
import { PageTabs } from './page_tabs';
import { createMemoryHistory } from 'history';

describe('PageTabs', () => {
  it('it renders all tabs', () => {
    const { getByText } = render(<PageTabs />);
    expect(getByText('Overview')).toBeInTheDocument();
    expect(getByText('Certificates')).toBeInTheDocument();
  });

  it('it keep params while switching', () => {
    const { getByTestId } = render(<PageTabs />, {
      history: createMemoryHistory({
        initialEntries: ['/settings/?g=%22%22&dateRangeStart=now-10m&dateRangeEnd=now'],
      }),
    });
    expect(getByTestId('uptimeSettingsToOverviewLink')).toHaveAttribute(
      'href',
      '/?dateRangeStart=now-10m'
    );
    expect(getByTestId('uptimeCertificatesLink')).toHaveAttribute(
      'href',
      '/certificates?dateRangeStart=now-10m'
    );
  });

  it('it resets params on overview if already on overview', () => {
    const { getByTestId } = render(<PageTabs />, {
      history: createMemoryHistory({
        initialEntries: ['/?g=%22%22&dateRangeStart=now-10m&dateRangeEnd=now'],
      }),
    });
    expect(getByTestId('uptimeSettingsToOverviewLink')).toHaveAttribute('href', '/');
  });
});
