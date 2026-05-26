/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { MainSignificantEvent } from './main_significant_event';

const meta: Meta<typeof MainSignificantEvent> = {
  title: 'app/Nightshift/MainSignificantEvent',
  component: MainSignificantEvent,
  argTypes: {
    blastRadiusScore: {
      control: { type: 'range', min: 0, max: 100 },
    },
  },
};

export default meta;
type Story = StoryObj<typeof MainSignificantEvent>;

export const Default: Story = {
  args: {
    blastRadiusScore: 90,
    onRemediate: action('onRemediate'),
    onViewDetails: action('onViewDetails'),
  },
};

export const ModerateScore: Story = {
  args: {
    ...Default.args,
    blastRadiusScore: 55,
  },
};

export const LowScore: Story = {
  args: {
    ...Default.args,
    blastRadiusScore: 25,
  },
};

export const CustomImpactedServices: Story = {
  args: {
    ...Default.args,
    title: 'Database connection pool exhausted affecting checkout and payment flows',
    impactedServices: [
      { id: 'postgres', label: 'postgres', iconType: 'layers' },
      { id: 'checkout', label: 'checkout', iconType: 'layers' },
      { id: 'payment', label: 'payment', iconType: 'layers' },
      { id: 'auth', label: 'auth', iconType: 'layers' },
    ],
  },
};

export const LongTitle: Story = {
  args: {
    ...Default.args,
    title:
      'Very long significant event title that spans multiple lines and describes in detail what happened to which services and why it is critical to address immediately',
  },
};
