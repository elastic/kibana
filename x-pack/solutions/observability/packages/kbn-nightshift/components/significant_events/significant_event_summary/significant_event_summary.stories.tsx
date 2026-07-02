/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { SignificantEventSummary } from './significant_event_summary';

const meta: Meta<typeof SignificantEventSummary> = {
  title: 'app/Nightshift/Significant events/SignificantEventSummary',
  component: SignificantEventSummary,
  args: {
    requireAction: 4,
    inProgress: 2,
    resolved: 11,
    demoted: 3,
  },
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      // width: 100% + maxWidth lets the cards wrap to fewer columns
      // as the viewport narrows (EuiFlexGroup responsive behaviour).
      <div style={{ width: '100%', maxWidth: 960 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof SignificantEventSummary>;

export const Default: Story = {};

/**
 * Empty buckets — verify the layout stays stable when all counts are
 * zero.
 */
export const Empty: Story = {
  args: { requireAction: 0, inProgress: 0, resolved: 0, demoted: 0 },
};

/**
 * Large counts — verify number formatting and ensure the layout
 * doesn't break when values are wide.
 */
export const LargeCounts: Story = {
  args: { requireAction: 1245, inProgress: 387, resolved: 9032, demoted: 211 },
};
