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
      'source.ip': '192.168.1.42',
      'user.name': 'admin',
      'http.request.method': 'GET',
      'url.original': '/faq',
      'http.version': '1.1',
      'nginx.access.body_sent.bytes': 1024,
      'http.response.status_code': 200,
    };
    const message = format(event);
    expect(message).toEqual([
      {
        constant: '[Nginx][access] ',
      },
      {
        field: 'source.ip',
        highlights: [],
        value: '192.168.1.42',
      },
      {
        constant: ' ',
      },
      {
        field: 'user.name',
        highlights: [],
        value: 'admin',
      },
      {
        constant: ' "',
      },
      {
        field: 'http.request.method',
        highlights: [],
        value: 'GET',
      },
      {
        constant: ' ',
      },
      {
        field: 'url.original',
        highlights: [],
        value: '/faq',
      },
      {
        constant: ' HTTP/',
      },
      {
        field: 'http.version',
        highlights: [],
        value: '1.1',
      },
      {
        constant: '" ',
      },
      {
        field: 'http.response.status_code',
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
