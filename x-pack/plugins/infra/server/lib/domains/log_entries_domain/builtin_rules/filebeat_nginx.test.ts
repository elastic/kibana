/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { compileFormattingRules } from '../message';
import { filebeatNginxRules } from './filebeat_nginx';

const { format } = compileFormattingRules(filebeatNginxRules);
describe('Filebeat Rules', () => {
  test('Nginx Access Rule', () => {
    const event = {
      'nginx.access': true,
      'nginx.access.remote_ip': '192.168.1.42',
      'nginx.access.user_name': 'admin',
      'nginx.access.method': 'GET',
      'nginx.access.url': '/faq',
      'nginx.access.http_version': '1.1',
      'nginx.access.body_sent.bytes': 1024,
      'nginx.access.response_code': 200,
    };
    const message = format(event);
    expect(message).toEqual([
      {
        constant: '[Nginx][access] ',
      },
      {
        field: 'nginx.access.remote_ip',
        highlights: [],
        value: '192.168.1.42',
      },
      {
        constant: ' ',
      },
      {
        field: 'nginx.access.user_name',
        highlights: [],
        value: 'admin',
      },
      {
        constant: ' "',
      },
      {
        field: 'nginx.access.method',
        highlights: [],
        value: 'GET',
      },
      {
        constant: ' ',
      },
      {
        field: 'nginx.access.url',
        highlights: [],
        value: '/faq',
      },
      {
        constant: ' HTTP/',
      },
      {
        field: 'nginx.access.http_version',
        highlights: [],
        value: '1.1',
      },
      {
        constant: '" ',
      },
      {
        field: 'nginx.access.response_code',
        highlights: [],
        value: '200',
      },
      {
        constant: ' ',
      },
      {
        field: 'nginx.access.body_sent.bytes',
        highlights: [],
        value: '1024',
      },
    ]);
  });
  test('Nginx Access Rule', () => {
    const event = {
      'nginx.error.message':
        'connect() failed (111: Connection refused) while connecting to upstream, client: 127.0.0.1, server: localhost, request: "GET /php-status?json= HTTP/1.1", upstream: "fastcgi://[::1]:9000", host: "localhost"',
      'nginx.error.level': 'error',
    };
    const message = format(event);
    expect(message).toEqual([
      {
        constant: '[Nginx]',
      },
      {
        constant: '[',
      },
      {
        field: 'nginx.error.level',
        highlights: [],
        value: 'error',
      },
      {
        constant: '] ',
      },
      {
        field: 'nginx.error.message',
        highlights: [],
        value:
          'connect() failed (111: Connection refused) while connecting to upstream, client: 127.0.0.1, server: localhost, request: "GET /php-status?json= HTTP/1.1", upstream: "fastcgi://[::1]:9000", host: "localhost"',
      },
    ]);
  });
});
