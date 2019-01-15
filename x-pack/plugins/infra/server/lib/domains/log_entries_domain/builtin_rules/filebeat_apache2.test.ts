/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { compileFormattingRules } from '../message';
import { filebeatApache2Rules } from './filebeat_apache2';

const { format } = compileFormattingRules(filebeatApache2Rules);
describe('Filebeat Rules', () => {
  test('Apache2 Access', () => {
    const event = {
      'apache2.access': true,
      'apache2.access.remote_ip': '192.168.1.42',
      'apache2.access.user_name': 'admin',
      'apache2.access.method': 'GET',
      'apache2.access.url': '/faqs',
      'apache2.access.http_version': '1.1',
      'apache2.access.response_code': '200',
      'apache2.access.body_sent.bytes': 1024,
    };
    const message = format(event);
    expect(message).toEqual([
      {
        constant: '[Apache][access] ',
      },
      {
        field: 'apache2.access.remote_ip',
        highlights: [],
        value: '192.168.1.42',
      },
      {
        constant: ' ',
      },
      {
        field: 'apache2.access.user_name',
        highlights: [],
        value: 'admin',
      },
      {
        constant: ' "',
      },
      {
        field: 'apache2.access.method',
        highlights: [],
        value: 'GET',
      },
      {
        constant: ' ',
      },
      {
        field: 'apache2.access.url',
        highlights: [],
        value: '/faqs',
      },
      {
        constant: ' HTTP/',
      },
      {
        field: 'apache2.access.http_version',
        highlights: [],
        value: '1.1',
      },
      {
        constant: '" ',
      },
      {
        field: 'apache2.access.response_code',
        highlights: [],
        value: '200',
      },
      {
        constant: ' ',
      },
      {
        field: 'apache2.access.body_sent.bytes',
        highlights: [],
        value: '1024',
      },
    ]);
  });
  test('Apache2 Error', () => {
    const event = {
      'apache2.error.message':
        'AH00489: Apache/2.4.18 (Ubuntu) configured -- resuming normal operations',
      'apache2.error.level': 'notice',
    };
    const message = format(event);
    expect(message).toEqual([
      {
        constant: '[Apache][',
      },
      {
        field: 'apache2.error.level',
        highlights: [],
        value: 'notice',
      },
      {
        constant: '] ',
      },
      {
        field: 'apache2.error.message',
        highlights: [],
        value: 'AH00489: Apache/2.4.18 (Ubuntu) configured -- resuming normal operations',
      },
    ]);
  });
});
