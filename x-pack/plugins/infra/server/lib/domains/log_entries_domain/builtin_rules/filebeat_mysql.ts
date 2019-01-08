/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const mysqlRules = [
  {
    when: {
      exists: ['mysql.error.message'],
    },
    format: [
      {
        constant: 'MySQL Error: ',
      },
      {
        field: 'mysql.error.message',
      },
    ],
  },
  {
    when: {
      exists: [
        'mysql.slowlog.user',
        'mysql.slowlog.ip',
        'mysql.slowlog.query_time.sec',
        'mysql.slowlog.query',
      ],
    },
    format: [
      {
        constant: 'MySQL Slow Log: ',
      },
      {
        field: 'mysql.slowlog.user',
      },
      {
        constant: '@',
      },
      {
        field: 'mysql.slowlog.ip',
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
