/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ComponentType } from 'react';

import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';

import { EndpointDetailsFlyoutTabs } from './components/endpoint_details_tabs';
import { EndpointActivityLog } from './endpoint_activity_log';
import { EndpointDetailsFlyout } from '.';

export default {
  title: 'Endpoints/Endpoint Details',
  component: EndpointDetailsFlyout,
  decorators: [
    (Story: ComponentType) => (
      <EuiThemeProvider>
        <Story />
      </EuiThemeProvider>
    ),
  ],
};

export const Tabs = () => (
  <EndpointDetailsFlyoutTabs
    show="details"
    hostname="endpoint-name-01"
    tabs={[
      {
        id: 'overview',
        name: 'Overview',
        content: <>{'Endpoint Details'}</>,
        route:
          '/administration/endpoints?page_index=0&page_size=10&selected_endpoint=endpoint-id-00001010&show=details',
      },
      {
        id: 'activity_log',
        name: 'Activity Log',
        content: ActivityLogMarkup(),
        route:
          '/administration/endpoints?page_index=0&page_size=10&selected_endpoint=endpoint-id-00001010&show=activity_log',
      },
    ]}
  />
);

export const ActivityLogMarkup = () => <EndpointActivityLog agentId={'some-agent-id'} />;
