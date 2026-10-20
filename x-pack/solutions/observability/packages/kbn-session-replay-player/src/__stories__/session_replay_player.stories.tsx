/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { SessionReplayPlayer } from '../..';

const meta: Meta<typeof SessionReplayPlayer> = {
  title: 'Observability/Session replay player',
  component: SessionReplayPlayer,
  decorators: [
    (Story) => (
      <Suspense fallback={null}>
        <Story />
      </Suspense>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof SessionReplayPlayer>;

export const Default: Story = {
  args: { sessionId: 'session-1' },
};
