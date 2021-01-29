/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ComponentProps } from 'react';
import { SyncBadge } from './SyncBadge';

export default {
  title: 'app/TransactionDetails/SyncBadge',
  component: SyncBadge,
  argTypes: {
    sync: {
      control: { type: 'inline-radio', options: [true, false, undefined] },
    },
  },
};

export function Example({ sync }: ComponentProps<typeof SyncBadge>) {
  return <SyncBadge sync={sync} />;
}
Example.args = { sync: true } as ComponentProps<typeof SyncBadge>;
