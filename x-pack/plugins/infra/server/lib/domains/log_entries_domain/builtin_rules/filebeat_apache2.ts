/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const filebeatApache2Rules = [
  {
    when: {
      exists: ['apache2.access'],
    },
    format: [
      {
        constant: 'apache2',
      },
      {
        constant: ' ',
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
        field: 'apache2.access.body_sent.bytes',
      },
    ],
  },
];
