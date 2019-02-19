/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const commonFrontendFields = [
  {
    field: 'haproxy.client.ip',
  },
  {
    constant: ':',
  },
  {
    field: 'haproxy.client.port',
  },
  {
    constant: ' ',
  },
  {
    field: 'haproxy.frontend_name',
  },
];

const commonBackendFields = [
  {
    constant: ' -> ',
  },
  {
    field: 'haproxy.backend_name',
  },
  {
    constant: '/',
  },
  {
    field: 'haproxy.server_name',
  },
];

const commonConnectionStatsFields = [
  {
    field: 'haproxy.connections.active',
  },
  {
    constant: '/',
  },
  {
    field: 'haproxy.connections.frontend',
  },
  {
    constant: '/',
  },
  {
    field: 'haproxy.connections.backend',
  },
  {
    constant: '/',
  },
  {
    field: 'haproxy.connections.server',
  },
  {
    constant: '/',
  },
  {
    field: 'haproxy.connections.retries',
  },
];

const commonQueueStatsFields = [
  {
    field: 'haproxy.server_queue',
  },
  {
    constant: '/',
  },
  {
    field: 'haproxy.backend_queue',
  },
];

export const filebeatHaproxyRules = [
  {
    // pre-ECS
    when: {
      exists: ['haproxy.http.request.raw_request_line'],
    },
    format: [
      {
        constant: '[HAProxy][http] ',
      },
      ...commonFrontendFields,
      ...commonBackendFields,
      {
        constant: ' "',
      },
      {
        field: 'haproxy.http.request.raw_request_line',
      },
      {
        constant: '" ',
      },
      {
        field: 'haproxy.http.response.status_code',
      },
      {
        constant: ' ',
      },
      {
        field: 'haproxy.http.request.time_wait_ms',
      },
      {
        constant: '/',
      },
      {
        field: 'haproxy.total_waiting_time_ms',
      },
      {
        constant: '/',
      },
      {
        field: 'haproxy.connection_wait_time_ms',
      },
      {
        constant: '/',
      },
      {
        field: 'haproxy.http.request.time_wait_without_data_ms',
      },
      {
        constant: '/',
      },
      {
        field: 'haproxy.http.request.time_active_ms',
      },
      {
        constant: ' ',
      },
      ...commonConnectionStatsFields,
      {
        constant: ' ',
      },
      ...commonQueueStatsFields,
    ],
  },
  {
    // pre-ECS
    when: {
      exists: ['haproxy.connections.active'],
    },
    format: [
      {
        constant: '[HAProxy][tcp] ',
      },
      ...commonFrontendFields,
      ...commonBackendFields,
      {
        constant: ' ',
      },
      ...commonConnectionStatsFields,
      {
        constant: ' ',
      },
      ...commonQueueStatsFields,
    ],
  },
  {
    // pre-ECS
    when: {
      exists: ['haproxy.error_message'],
    },
    format: [
      {
        constant: '[HAProxy] ',
      },
      ...commonFrontendFields,
      {
        constant: ' ',
      },
      {
        field: 'haproxy.error_message',
      },
    ],
  },
  {
    // pre-ECS
    when: {
      exists: ['haproxy.frontend_name'],
    },
    format: [
      {
        constant: '[HAProxy] ',
      },
      ...commonFrontendFields,
      {
        constant: ' ',
      },
    ],
  },
];
