/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const filebeatMySQLRules = [
  {
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
        constant: 'sec - ',
      },
      {
        field: 'mysql.slowlog.query',
      },
    ],
  },
];
