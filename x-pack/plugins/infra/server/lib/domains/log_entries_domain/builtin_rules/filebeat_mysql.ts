/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const filebeatMySQLRules = [
  {
    // pre-ECS
    when: {
      exists: ['mysql.error.message'],
    },
    format: [
      {
        constant: '[MySQL][error] ',
      },
      {
        field: 'mysql.error.message',
      },
    ],
  },
  {
    // ECS
    when: {
      exists: ['ecs.version', 'mysql.slowlog.query'],
    },
    format: [
      {
        constant: '[MySQL][slowlog] ',
      },
      {
        field: 'user.name',
      },
      {
        constant: '@',
      },
      {
        field: 'source.domain',
      },
      {
        constant: ' [',
      },
      {
        field: 'source.ip',
      },
      {
        constant: '] ',
      },
      {
        constant: ' - ',
      },
      {
        field: 'event.duration',
      },
      {
        constant: ' ns - ',
      },
      {
        field: 'mysql.slowlog.query',
      },
    ],
  },
  {
    // pre-ECS
    when: {
      exists: ['mysql.slowlog.user', 'mysql.slowlog.query_time.sec', 'mysql.slowlog.query'],
    },
    format: [
      {
        constant: '[MySQL][slowlog] ',
      },
      {
        field: 'mysql.slowlog.user',
      },
      {
        constant: '@',
      },
      {
        field: 'mysql.slowlog.host',
      },
      {
        constant: ' [',
      },
      {
        field: 'mysql.slowlog.ip',
      },
      {
        constant: '] ',
      },
      {
        constant: ' - ',
      },
      {
        field: 'mysql.slowlog.query_time.sec',
      },
      {
        constant: ' s - ',
      },
      {
        field: 'mysql.slowlog.query',
      },
    ],
  },
];
