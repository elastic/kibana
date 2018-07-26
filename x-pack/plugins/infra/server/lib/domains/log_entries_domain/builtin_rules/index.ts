/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const builtinRules = [
  {
    when: {
      exists: ['system.syslog.message'],
    },
    format: [
      {
        field: 'system.syslog.message',
      },
    ],
  },
  {
    when: {
      exists: ['system.auth.message'],
    },
    format: [
      {
        field: 'system.auth.message',
      },
    ],
  },
  {
    when: {
      exists: ['message'],
    },
    format: [
      {
        field: 'message',
      },
    ],
  },
  {
    when: {
      exists: ['@message'],
    },
    format: [
      {
        field: '@message',
      },
    ],
  },
  {
    when: {
      exists: [],
    },
    format: [
      {
        constant: 'failed to find message',
      },
    ],
  },
];
