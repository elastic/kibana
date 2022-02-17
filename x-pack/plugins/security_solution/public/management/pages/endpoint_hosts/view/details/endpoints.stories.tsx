/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ComponentType } from 'react';
import moment from 'moment';

import {
  ActivityLog,
  Immutable,
  ActivityLogItemTypes,
} from '../../../../../../common/endpoint/types';
import { EndpointDetailsFlyoutTabs } from './components/endpoint_details_tabs';
import { EndpointActivityLog } from './endpoint_activity_log';
import { EndpointDetailsFlyout } from '.';
import { EuiThemeProvider } from '../../../../../../../../../src/plugins/kibana_react/common';
import { AsyncResourceState } from '../../../../state';

export const dummyEndpointActivityLog = (
  selectedEndpoint: string = ''
): AsyncResourceState<Immutable<ActivityLog>> => ({
  type: 'LoadedResourceState',
  data: {
    page: 1,
    pageSize: 50,
    startDate: moment().subtract(5, 'day').fromNow().toString(),
    endDate: moment().toString(),
    data: [
      {
        type: ActivityLogItemTypes.FLEET_ACTION,
        item: {
          id: '',
          data: {
            action_id: '1',
            '@timestamp': moment().subtract(1, 'hours').fromNow().toString(),
            expiration: moment().add(3, 'day').fromNow().toString(),
            type: 'INPUT_ACTION',
            input_type: 'endpoint',
            agents: [`${selectedEndpoint}`],
            user_id: 'sys',
            data: {
              command: 'isolate',
            },
          },
        },
      },
      {
        type: ActivityLogItemTypes.FLEET_ACTION,
        item: {
          id: '',
          data: {
            action_id: '2',
            '@timestamp': moment().subtract(2, 'hours').fromNow().toString(),
            expiration: moment().add(1, 'day').fromNow().toString(),
            type: 'INPUT_ACTION',
            input_type: 'endpoint',
            agents: [`${selectedEndpoint}`],
            user_id: 'ash',
            data: {
              command: 'isolate',
              comment: 'Sem et tortor consequat id porta nibh venenatis cras sed.',
            },
          },
        },
      },
      {
        type: ActivityLogItemTypes.FLEET_ACTION,
        item: {
          id: '',
          data: {
            action_id: '3',
            '@timestamp': moment().subtract(4, 'hours').fromNow().toString(),
            expiration: moment().add(1, 'day').fromNow().toString(),
            type: 'INPUT_ACTION',
            input_type: 'endpoint',
            agents: [`${selectedEndpoint}`],
            user_id: 'someone',
            data: {
              command: 'unisolate',
              comment: 'Turpis egestas pretium aenean pharetra.',
            },
          },
        },
      },
      {
        type: ActivityLogItemTypes.FLEET_ACTION,
        item: {
          id: '',
          data: {
            action_id: '4',
            '@timestamp': moment().subtract(1, 'day').fromNow().toString(),
            expiration: moment().add(3, 'day').fromNow().toString(),
            type: 'INPUT_ACTION',
            input_type: 'endpoint',
            agents: [`${selectedEndpoint}`],
            user_id: 'ash',
            data: {
              command: 'isolate',
              comment:
                'Lorem \
                  ipsum dolor sit amet, consectetur adipiscing elit, \
                  sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
            },
          },
        },
      },
    ],
  },
});

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

export const ActivityLogMarkup = () => (
  <EndpointActivityLog activityLog={dummyEndpointActivityLog()} />
);
