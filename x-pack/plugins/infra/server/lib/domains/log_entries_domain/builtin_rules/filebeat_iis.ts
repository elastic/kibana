/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const filebeatIisRules = [
  {
    // pre-ECS
    when: {
      exists: ['iis.access.method'],
    },
    format: [
      {
        constant: '[iis][access] ',
      },
      {
        field: 'iis.access.remote_ip',
      },
      {
        constant: ' ',
      },
      {
        field: 'iis.access.user_name',
      },
      {
        constant: ' "',
      },
      {
        field: 'iis.access.method',
      },
      {
        constant: ' ',
      },
      {
        field: 'iis.access.url',
      },
      {
        constant: ' HTTP/',
      },
      {
        field: 'iis.access.http_version',
      },
      {
        constant: '" ',
      },
      {
        field: 'iis.access.response_code',
      },
      {
        constant: ' ',
      },
      {
        field: 'iis.access.body_sent.bytes',
      },
    ],
  },
  {
    // pre-ECS
    when: {
      exists: ['iis.error.url'],
    },
    format: [
      {
        constant: '[iis][error] ',
      },
      {
        field: 'iis.error.remote_ip',
      },
      {
        constant: ' "',
      },
      {
        field: 'iis.error.method',
      },
      {
        constant: ' ',
      },
      {
        field: 'iis.error.url',
      },
      {
        constant: ' HTTP/',
      },
      {
        field: 'iis.error.http_version',
      },
      {
        constant: '" ',
      },
      {
        field: 'iis.error.response_code',
      },
      {
        constant: ' ',
      },
      {
        field: 'iis.error.reason_phrase',
      },
    ],
  },
  {
    // ECS
    when: {
      exists: ['ecs.version', 'iis.error.reason_phrase'],
    },
    format: [
      {
        constant: '[iis][error] ',
      },
      {
        field: 'source.ip',
      },
      {
        constant: ' ',
      },
      {
        field: 'iis.error.reason_phrase',
      },
    ],
  },
  {
    // pre-ECS
    when: {
      exists: ['iis.error.reason_phrase'],
    },
    format: [
      {
        constant: '[iis][error] ',
      },
      {
        field: 'iis.error.remote_ip',
      },
      {
        constant: ' ',
      },
      {
        field: 'iis.error.reason_phrase',
      },
    ],
  },
];
