/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const commonPrefixFields = [
  { constant: '[' },
  { field: 'event.module' },
  { constant: '][access] ' },
];

export const genericWebserverRules = [
  {
    // ECS with parsed url
    when: {
      exists: ['ecs.version', 'http.response.status_code', 'url.path'],
    },
    format: [
      ...commonPrefixFields,
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
        field: 'url.path',
      },
      {
        constant: '?',
      },
      {
        field: 'url.query',
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
    // ECS with original url
    when: {
      exists: ['ecs.version', 'http.response.status_code'],
    },
    format: [
      ...commonPrefixFields,
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
];
