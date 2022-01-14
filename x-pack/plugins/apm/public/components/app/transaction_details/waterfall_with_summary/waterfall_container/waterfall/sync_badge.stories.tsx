/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { SyncBadge, SyncBadgeProps } from './sync_badge';

export default {
  title: 'app/TransactionDetails/SyncBadge',
  component: SyncBadge,
  argTypes: {
    sync: {
      control: { type: 'inline-radio', options: [true, false, undefined] },
    },
  },
};

export function Example({ sync }: SyncBadgeProps) {
  return <SyncBadge sync={sync} />;
}
Example.args = { sync: true } as SyncBadgeProps;
