/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { CriticalityDonut } from './criticality_donut';

const meta: Meta<typeof CriticalityDonut> = {
  title: 'app/SigeventsOverview/CriticalityDonut',
  component: CriticalityDonut,
  argTypes: {
    score: {
      control: { type: 'range', min: 0, max: 100 },
    },
    isCritical: {
      control: 'boolean',
    },
    size: {
      control: { type: 'range', min: 50, max: 200 },
    },
    strokeWidth: {
      control: { type: 'range', min: 5, max: 30 },
    },
  },
};

export default meta;
type Story = StoryObj<typeof CriticalityDonut>;

export const Critical: Story = {
  args: {
    score: 85,
    isCritical: true,
    size: 100,
    strokeWidth: 18,
  },
};

export const Healthy: Story = {
  args: {
    score: 25,
    isCritical: false,
    size: 100,
    strokeWidth: 18,
  },
};

export const FullScore: Story = {
  args: {
    score: 100,
    isCritical: true,
    size: 100,
    strokeWidth: 18,
  },
};

export const ZeroScore: Story = {
  args: {
    score: 0,
    isCritical: false,
    size: 100,
    strokeWidth: 18,
  },
};

export const LargeSize: Story = {
  args: {
    score: 72,
    isCritical: true,
    size: 150,
    strokeWidth: 24,
  },
};

export const SmallSize: Story = {
  args: {
    score: 45,
    isCritical: false,
    size: 60,
    strokeWidth: 10,
  },
};

export const MultipleDonutsComparison: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
      <CriticalityDonut score={15} isCritical={false} />
      <CriticalityDonut score={45} isCritical={false} />
      <CriticalityDonut score={75} isCritical={true} />
      <CriticalityDonut score={95} isCritical={true} />
    </div>
  ),
};
