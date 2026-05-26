/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { StatusHeaderBanner } from './status_header_banner';

const meta: Meta<typeof StatusHeaderBanner> = {
  title: 'app/Nightshift/StatusHeaderBanner',
  component: StatusHeaderBanner,
  argTypes: {
    variant: {
      control: 'select',
      options: ['critical', 'noCriticalEvents'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof StatusHeaderBanner>;

export const Critical: Story = {
  args: {
    variant: 'critical',
    title: 'You have critical significant events impacting your systems',
    description: 'Impacting: payment, checkout',
    timestamp: '(5 minutes ago)',
    onMenuClick: () => {},
  },
};

export const NoCriticalEvents: Story = {
  args: {
    variant: 'noCriticalEvents',
    timestamp: '(5 minutes ago)',
    onMenuClick: () => {},
  },
};

export const WithoutTimestampAndMenu: Story = {
  args: {
    variant: 'critical',
  },
};
