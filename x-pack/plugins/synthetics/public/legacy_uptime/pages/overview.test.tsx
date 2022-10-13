/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { OverviewPageComponent } from './overview';
import { render } from '../lib/helper/rtl_helpers';

describe('MonitorPage', () => {
  it('renders expected elements for valid props', async () => {
    const { findByText, findByPlaceholderText } = render(<OverviewPageComponent />);

    expect(await findByText('No uptime monitors found')).toBeInTheDocument();

    expect(
      await findByPlaceholderText('Search by monitor ID, name, or url (E.g. http:// )')
    ).toBeInTheDocument();
  });
});
