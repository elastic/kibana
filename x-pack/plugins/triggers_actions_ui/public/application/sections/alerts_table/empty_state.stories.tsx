/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EmptyState as Component } from './empty_state';

export default {
  component: Component,
  title: 'app/AlertTable',
  argTypes: {
    height: { type: 'select', options: ['short', 'tall'] },
  },
};

export const EmptyState = {
  args: {
    height: 'tall',
  },
};
