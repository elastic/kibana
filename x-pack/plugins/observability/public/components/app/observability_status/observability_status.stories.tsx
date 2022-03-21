/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Story } from '@storybook/react';
import { ObservabilityStatusBoxes, ObservabilityStatusProps } from './observability_status_boxes';

export default {
  title: 'app/ObservabilityStatusBoxes',
  component: ObservabilityStatusBoxes,
};

const testBoxes = [
  {
    id: 'infra_logs',
    title: 'Logs',
    description:
      'Fast, easy, and scalable, centralized log monitoring with out-of-the-box support for common data sources.',
    addTitle: 'Add integrations',
    addLink: '/app/integrations/browse?q=logs',
    learnMoreLink: 'http://lean-more-link-example.com',
    goToAppTitle: 'Show log stream',
    goToAppLink: '/app/logs/stream',
    hasData: false,
    modules: [],
  },
  {
    id: 'apm',
    title: 'APM',
    description:
      'Get deeper visibility into your applications with extensive support for popular languages, OpenTelemetry, and distributed tracing.',
    addTitle: 'Add data',
    addLink: '/app/home#/tutorial/apm',
    learnMoreLink: 'http://lean-more-link-example.com',
    goToAppTitle: 'Show services inventory',
    goToAppLink: '/app/apm/services',
    hasData: false,
    modules: [],
  },
  {
    id: 'infra_metrics',
    title: 'Infrastructure',
    description: 'Stream, visualize, and analyze your infrastructure metrics.',
    addTitle: 'Add integrations',
    addLink: '/app/integrations/browse?q=metrics',
    learnMoreLink: 'http://lean-more-link-example.com',
    goToAppTitle: 'Show inventory',
    goToAppLink: '/app/metrics/inventory',
    hasData: false,
    modules: [],
  },
  {
    id: 'synthetics',
    title: 'Uptime',
    description: 'Proactively monitor the availability and functionality of user journeys.',
    addTitle: 'Add monitors',
    addLink: '/app/home#/tutorial/uptimeMonitors',
    learnMoreLink: 'http://lean-more-link-example.com',
    goToAppTitle: 'Show monitors ',
    goToAppLink: '/app/uptime',
    hasData: false,
    modules: [],
  },
  {
    id: 'ux',
    title: 'User Experience',
    description:
      'Collect, measure, and analyze performance data that reflects real-world user experiences.',
    addTitle: 'Add data',
    addLink: '/app/home#/tutorial/apm',
    learnMoreLink: 'http://lean-more-link-example.com',
    goToAppTitle: 'Show dashboard',
    goToAppLink: '/app/ux',
    hasData: true,
    modules: [],
  },
  {
    id: 'alert',
    title: 'Alerting',
    description:
      'Detect complex conditions in Observability and trigger actions when those conditions are met.',
    addTitle: 'Create rules',
    addLink: '/app/management/insightsAndAlerting/triggersActions/rules',
    learnMoreLink: 'http://lean-more-link-example.com',
    goToAppTitle: 'Show alerts',
    goToAppLink: '/app/observability/alerts',
    hasData: true,
    modules: [],
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
