/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const filebeatNginxRules = [
  {
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
