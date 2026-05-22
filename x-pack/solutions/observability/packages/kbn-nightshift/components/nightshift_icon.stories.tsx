/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { NightshiftIcon } from './nightshift_icon';

const meta: Meta<typeof NightshiftIcon> = {
  title: 'app/Nightshift/NightshiftIcon',
  component: NightshiftIcon,
};

export default meta;
type Story = StoryObj<typeof NightshiftIcon>;

export const Icon: Story = {
  args: {
    size: 'xxl',
  },
};
