/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ComponentType } from 'react';

import { EndpointDetailsFlyoutTabs } from './components/endpoint_details_tabs';
import { EndpointActivityLog } from './endpoint_activity_log';
import { EndpointDetailsFlyout } from '.';
import { EuiThemeProvider } from '../../../../../../../../../src/plugins/kibana_react/common';

import { dummyEndpointActions } from './';

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
    tabs={[
      {
        id: 'overview',
        name: 'Overview',
        content: <>{'Endpoint Details'}</>,
      },
      {
        id: 'activity-log',
        name: 'Activity Log',
        content: ActivityLog(),
      },
    ]}
  />
);

export const ActivityLog = () => <EndpointActivityLog endpointActions={dummyEndpointActions} />;
