/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import moment from 'moment-timezone';
import { TimestampTooltip } from '.';
import { mockNow } from '../../../utils/test_helpers';

describe('TimestampTooltip', () => {
  const timestamp = 1570720000123; // Oct 10, 2019, 08:06:40.123 (UTC-7)

  beforeAll(() => {
    // mock Date.now
    mockNow(1570737000000);
    moment.tz.setDefault('America/Los_Angeles');
  });

  afterAll(() => {
    moment.tz.setDefault('');
  });

  it('renders relative time in body and absolute time in tooltip', async () => {
    const user = userEvent.setup();
    render(<TimestampTooltip time={timestamp} />);

    const relativeTime = screen.getByText('5 hours ago');
    expect(relativeTime).toBeInTheDocument();

    await user.hover(relativeTime);

    const tooltip = await screen.findByText('Oct 10, 2019, 08:06:40.123 (UTC-7)');
    expect(tooltip).toBeInTheDocument();
  });

  it('formats with precision in milliseconds by default', async () => {
    const user = userEvent.setup();
    render(<TimestampTooltip time={timestamp} />);

    await user.hover(screen.getByText('5 hours ago'));

    const tooltip = await screen.findByText('Oct 10, 2019, 08:06:40.123 (UTC-7)');
    expect(tooltip).toBeInTheDocument();
  });

  it('formats with precision in seconds', async () => {
    const user = userEvent.setup();
    render(<TimestampTooltip time={timestamp} timeUnit="seconds" />);

    await user.hover(screen.getByText('5 hours ago'));

    const tooltip = await screen.findByText('Oct 10, 2019, 08:06:40 (UTC-7)');
    expect(tooltip).toBeInTheDocument();
  });

  it('formats with precision in minutes', async () => {
    const user = userEvent.setup();
    render(<TimestampTooltip time={timestamp} timeUnit="minutes" />);

    await user.hover(screen.getByText('5 hours ago'));

    const tooltip = await screen.findByText('Oct 10, 2019, 08:06 (UTC-7)');
    expect(tooltip).toBeInTheDocument();
  });
});
