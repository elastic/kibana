/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { compileFormattingRules } from '../message';
import { filebeatMySQLRules } from './filebeat_mysql';

const { format } = compileFormattingRules(filebeatMySQLRules);

describe('Filebeat Rules', () => {
  test('mysql error log', () => {
    const errorDoc = {
      'mysql.error.message':
        "Access denied for user 'petclinicdd'@'47.153.152.234' (using password: YES)",
    };
    const message = format(errorDoc);
    expect(message).toEqual([
      {
        constant: '[MySQL][error] ',
      },
      {
        field: 'mysql.error.message',
        highlights: [],
        value: "Access denied for user 'petclinicdd'@'47.153.152.234' (using password: YES)",
      },
    ]);
  });
  test('mysql slow log', () => {
    const errorDoc = {
      'mysql.slowlog.query': 'select * from hosts',
      'mysql.slowlog.query_time.sec': 5,
      'mysql.slowlog.user': 'admin',
      'mysql.slowlog.ip': '192.168.1.42',
      'mysql.slowlog.host': 'webserver-01',
    };
    const message = format(errorDoc);
    expect(message).toEqual([
      {
        constant: '[MySQL][slowlog] ',
      },
      {
        field: 'mysql.slowlog.user',
        highlights: [],
        value: 'admin',
      },
      {
        constant: '@',
      },
      {
        field: 'mysql.slowlog.host',
        highlights: [],
        value: 'webserver-01',
      },
      {
        constant: ' [',
      },
      {
        field: 'mysql.slowlog.ip',
        highlights: [],
        value: '192.168.1.42',
      },
      {
        constant: '] ',
      },
      {
        constant: ' - ',
      },
      {
        field: 'mysql.slowlog.query_time.sec',
        highlights: [],
        value: '5',
      },
      {
        constant: 'sec - ',
      },
      {
        field: 'mysql.slowlog.query',
        highlights: [],
        value: 'select * from hosts',
      },
    ]);
  });
});
