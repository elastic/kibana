/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const filebeatNginxRules = [
  {
    // ECS
    when: {
      values: {
        'event.dataset': 'nginx.access',
      },
    },
    format: [
      {
        constant: '[Nginx][access] ',
      },
      {
        field: 'source.ip',
      },
      {
        constant: ' ',
      },
      {
        field: 'user.name',
      },
      {
        constant: ' "',
      },
      {
        field: 'http.request.method',
      },
      {
        constant: ' ',
      },
      {
        field: 'url.original',
      },
      {
        constant: ' HTTP/',
      },
      {
        field: 'http.version',
      },
      {
        constant: '" ',
      },
      {
        field: 'http.response.status_code',
      },
      {
        constant: ' ',
      },
      {
        field: 'http.response.body.bytes',
      },
    ],
  },
  {
    // pre-ECS
    when: {
      exists: ['nginx.access'],
    },
    format: [
      {
        constant: '[Nginx][access] ',
      },
      {
        field: 'nginx.access.remote_ip',
      },
      {
        constant: ' ',
      },
      {
        field: 'nginx.access.user_name',
      },
      {
        constant: ' "',
      },
      {
        field: 'nginx.access.method',
      },
      {
        constant: ' ',
      },
      {
        field: 'nginx.access.url',
      },
      {
        constant: ' HTTP/',
      },
      {
        field: 'nginx.access.http_version',
      },
      {
        constant: '" ',
      },
      {
        field: 'nginx.access.response_code',
      },
      {
        constant: ' ',
      },
      {
        field: 'nginx.access.body_sent.bytes',
      },
    ],
  },
  {
    // ECS
    when: {
      values: {
        'event.dataset': 'nginx.error',
      },
    },
    format: [
      {
        constant: '[Nginx]',
      },
      {
        constant: '[',
      },
      {
        field: 'log.level',
      },
      {
        constant: '] ',
      },
      {
        field: 'message',
      },
    ],
  },
  {
    // pre-ECS
    when: {
      exists: ['nginx.error.message'],
    },
    format: [
      {
        constant: '[Nginx]',
      },
      {
        constant: '[',
      },
      {
        field: 'nginx.error.level',
      },
      {
        constant: '] ',
      },
      {
        field: 'nginx.error.message',
      },
    ],
  },
];
