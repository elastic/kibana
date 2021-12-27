/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ComponentType } from 'react';
import { Story } from '@storybook/react';
import { EuiProvider } from '@elastic/eui';
import { ObservabilityStatusBoxes, ObservabilityStatusProps } from './observability_status_boxes';

export default {
  title: 'app/ObservabilityStatusBoxes',
  component: ObservabilityStatusBoxes,
  decorators: [
    (StoryComponent: ComponentType) => (
      <EuiProvider>
        <StoryComponent />
      </EuiProvider>
    ),
  ],
};

const testBoxes = [
  {
    id: 'logs',
    dataSource: 'Logs',
    hasData: true,
    description: 'This is the description for logs',
    modules: [
      { name: 'system', hasData: true },
      { name: 'kubernetes', hasData: false },
      { name: 'docker', hasData: true },
    ],
    integrationLink: 'http://example.com',
    learnMoreLink: 'http://example.com',
  },
  {
    id: 'metrics',
    dataSource: 'Metrics',
    hasData: true,
    description: 'This is the description for metrics',
    modules: [
      { name: 'system', hasData: true },
      { name: 'kubernetes', hasData: true },
      { name: 'docker', hasData: false },
    ],
    integrationLink: 'http://example.com',
    learnMoreLink: 'http://example.com',
  },
  {
    id: 'apm',
    dataSource: 'APM',
    hasData: true,
    description: 'This is the description for apm',
    modules: [
      { name: 'system', hasData: true },
      { name: 'kubernetes', hasData: true },
      { name: 'docker', hasData: true },
    ],
    integrationLink: 'http://example.com',
    learnMoreLink: 'http://example.com',
  },
  {
    id: 'uptime',
    dataSource: 'Uptime',
    hasData: false,
    description: 'This is the description for uptime',
    modules: [
      { name: 'system', hasData: true },
      { name: 'kubernetes', hasData: true },
      { name: 'docker', hasData: true },
    ],
    integrationLink: 'http://example.com',
    learnMoreLink: 'http://example.com',
  },
  {
    id: 'ux',
    dataSource: 'User experience',
    hasData: false,
    description: 'This is the description for user experience',
    modules: [
      { name: 'system', hasData: true },
      { name: 'kubernetes', hasData: true },
      { name: 'docker', hasData: true },
    ],
    integrationLink: 'http://example.com',
    learnMoreLink: 'http://example.com',
  },
  {
    id: 'alerts',
    dataSource: 'Alerts and rules',
    hasData: true,
    description: 'This is the description for alerts and rules',
    modules: [
      { name: 'system', hasData: true },
      { name: 'kubernetes', hasData: true },
      { name: 'docker', hasData: true },
    ],
    integrationLink: 'http://example.com',
    learnMoreLink: 'http://example.com',
  },
];

const Template: Story<ObservabilityStatusProps> = ({ boxes }: ObservabilityStatusProps) => {
  return (
    <div style={{ width: 380, backgroundColor: '#fff', padding: 40 }}>
      <ObservabilityStatusBoxes boxes={boxes} />
    </div>
  );
};
export const Example = Template.bind({});
Example.args = {
  boxes: testBoxes,
};
