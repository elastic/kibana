/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { SyncBadge, SyncBadgeProps } from './sync_badge';

export default {
  title: 'app/TransactionDetails/Waterfall/Badge/SyncBadge',
  component: SyncBadge,
  argTypes: {
    sync: {
      control: { type: 'inline-radio', options: [true, false, undefined] },
    },
    agentName: {
      control: {
        type: 'select',
        options: [
          'nodejs',
          'js-base',
          'rum-js',
          'php',
          'python',
          'dotnet',
          'iOS/swift',
          'ruby',
          'java',
          'go',
        ],
      },
    },
  },
};

export function Example({ sync, agentName }: SyncBadgeProps) {
  return <SyncBadge sync={sync} agentName={agentName} />;
}
Example.args = { sync: true, agentName: 'nodejs' } as SyncBadgeProps;
