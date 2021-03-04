/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ComponentType } from 'react';
import { AlertsPage } from '.';

export default {
  title: 'app/Alerts',
  component: AlertsPage,
  decorators: [
    (Story: ComponentType) => {
      return <Story />;
    },
  ],
};

export function Example() {
  const items = [
    { '@timestamp': new Date().toISOString(), severity: 'critical', reason: 'Some reason' },
  ];
  return <AlertsPage items={items} />;
}

export function EmptyState() {
  return <AlertsPage />;
}
