/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { compileFormattingRules } from '../message';
import { filebeatHaproxyRules } from './filebeat_haproxy';

const { format } = compileFormattingRules(filebeatHaproxyRules);

describe('Filebeat Rules', () => {
  describe('in ECS format', () => {
    test('haproxy default log', () => {
      const flattenedDocument = {
        'destination.ip': '1.2.3.4',
        'destination.port': 5000,
        'ecs.version': '1.0.0-beta2',
        'event.dataset': 'haproxy.log',
        'event.module': 'haproxy',
        'fileset.name': 'log',
        'haproxy.frontend_name': 'main',
        'haproxy.mode': 'HTTP',
        'haproxy.source': '1.2.3.4',
        'input.type': 'log',
        'log.offset': 0,
        'process.name': 'haproxy',
        'process.pid': 24551,
        'service.type': 'haproxy',
        'source.address': '1.2.3.4',
        'source.geo.continent_name': 'North America',
        'source.geo.country_iso_code': 'US',
        'source.geo.location.lat': 37.751,
        'source.geo.location.lon': -97.822,
        'source.ip': '1.2.3.4',
        'source.port': 40780,
      };

      expect(format(flattenedDocument, {})).toMatchInlineSnapshot(`
Array [
  Object {
    "constant": "[HAProxy] ",
  },
  Object {
    "field": "source.address",
    "highlights": Array [],
    "value": "1.2.3.4",
  },
  Object {
    "constant": ":",
  },
  Object {
    "field": "source.port",
    "highlights": Array [],
    "value": "40780",
  },
  Object {
    "constant": " ",
  },
  Object {
    "field": "haproxy.frontend_name",
    "highlights": Array [],
    "value": "main",
  },
]
`);
    });

    test('haproxy tcp log', () => {
      const flattenedDocument = {
        'ecs.version': '1.0.0-beta2',
        'event.dataset': 'haproxy.log',
        'event.duration': 1000000,
        'event.module': 'haproxy',
        'fileset.name': 'log',
        'haproxy.backend_name': 'app',
        'haproxy.backend_queue': 0,
        'haproxy.bytes_read': 212,
        'haproxy.connection_wait_time_ms': -1,
        'haproxy.connections.active': 1,
        'haproxy.connections.backend': 0,
        'haproxy.connections.frontend': 1,
        'haproxy.connections.retries': 0,
        'haproxy.connections.server': 0,
        'haproxy.frontend_name': 'main',
        'haproxy.server_name': '<NOSRV>',
        'haproxy.server_queue': 0,
        'haproxy.source': '127.0.0.1',
        'haproxy.termination_state': 'SC',
        'haproxy.total_waiting_time_ms': -1,
        'input.type': 'log',
        'log.offset': 0,
        'process.name': 'haproxy',
        'process.pid': 25457,
        'service.type': 'haproxy',
        'source.address': '127.0.0.1',
        'source.ip': '127.0.0.1',
        'source.port': 40962,
      };

      expect(format(flattenedDocument, {})).toMatchInlineSnapshot(`
Array [
  Object {
    "constant": "[HAProxy][tcp] ",
  },
  Object {
    "field": "source.address",
    "highlights": Array [],
    "value": "127.0.0.1",
  },
  Object {
    "constant": ":",
  },
  Object {
    "field": "source.port",
    "highlights": Array [],
    "value": "40962",
  },
  Object {
    "constant": " ",
  },
  Object {
    "field": "haproxy.frontend_name",
    "highlights": Array [],
    "value": "main",
  },
  Object {
    "constant": " -> ",
  },
  Object {
    "field": "haproxy.backend_name",
    "highlights": Array [],
    "value": "app",
  },
  Object {
    "constant": "/",
  },
  Object {
    "field": "haproxy.server_name",
    "highlights": Array [],
    "value": "<NOSRV>",
  },
  Object {
    "constant": " ",
  },
  Object {
    "field": "haproxy.connections.active",
    "highlights": Array [],
    "value": "1",
  },
  Object {
    "constant": "/",
  },
  Object {
    "field": "haproxy.connections.frontend",
    "highlights": Array [],
    "value": "1",
  },
  Object {
    "constant": "/",
  },
  Object {
    "field": "haproxy.connections.backend",
    "highlights": Array [],
    "value": "0",
  },
  Object {
    "constant": "/",
  },
  Object {
    "field": "haproxy.connections.server",
    "highlights": Array [],
    "value": "0",
  },
  Object {
    "constant": "/",
  },
  Object {
    "field": "haproxy.connections.retries",
    "highlights": Array [],
    "value": "0",
  },
  Object {
    "constant": " ",
  },
  Object {
    "field": "haproxy.server_queue",
    "highlights": Array [],
    "value": "0",
  },
  Object {
    "constant": "/",
  },
  Object {
    "field": "haproxy.backend_queue",
    "highlights": Array [],
    "value": "0",
  },
]
`);
    });

    test('haproxy http log', () => {
      const flattenedDocument = {
        'ecs.version': '1.0.0-beta2',
        'event.dataset': 'haproxy.log',
        'event.duration': 2000000,
        'event.module': 'haproxy',
        'fileset.name': 'log',
        'haproxy.backend_name': 'docs_microservice',
        'haproxy.backend_queue': 0,
        'haproxy.bytes_read': 168,
        'haproxy.connection_wait_time_ms': 1,
        'haproxy.connections.active': 6,
        'haproxy.connections.backend': 0,
        'haproxy.connections.frontend': 6,
        'haproxy.connections.retries': 0,
        'haproxy.connections.server': 0,
        'haproxy.frontend_name': 'incoming~',
        'haproxy.http.request.captured_cookie': '-',
        'haproxy.http.request.captured_headers': ['docs.example.internal'],
        'haproxy.http.request.raw_request_line':
          'GET /component---src-pages-index-js-4b15624544f97cf0bb8f.js HTTP/1.1',
        'haproxy.http.request.time_wait_ms': 0,
        'haproxy.http.request.time_wait_without_data_ms': 0,
        'haproxy.http.response.captured_cookie': '-',
        'haproxy.http.response.captured_headers': [],
        'haproxy.server_name': 'docs',
        'haproxy.server_queue': 0,
        'haproxy.termination_state': '----',
        'haproxy.total_waiting_time_ms': 0,
        'http.response.bytes': 168,
        'http.response.status_code': 304,
        'input.type': 'log',
        'log.offset': 0,
        'process.name': 'haproxy',
        'process.pid': 32450,
        'service.type': 'haproxy',
        'source.address': '1.2.3.4',
        'source.geo.continent_name': 'North America',
        'source.geo.country_iso_code': 'US',
        'source.geo.location.lat': 37.751,
        'source.geo.location.lon': -97.822,
        'source.ip': '1.2.3.4',
        'source.port': 38862,
      };

      expect(format(flattenedDocument, {})).toMatchInlineSnapshot(`
Array [
  Object {
    "constant": "[HAProxy][http] ",
  },
  Object {
    "field": "source.address",
    "highlights": Array [],
    "value": "1.2.3.4",
  },
  Object {
    "constant": ":",
  },
  Object {
    "field": "source.port",
    "highlights": Array [],
    "value": "38862",
  },
  Object {
    "constant": " ",
  },
  Object {
    "field": "haproxy.frontend_name",
    "highlights": Array [],
    "value": "incoming~",
  },
  Object {
    "constant": " -> ",
  },
  Object {
    "field": "haproxy.backend_name",
    "highlights": Array [],
    "value": "docs_microservice",
  },
  Object {
    "constant": "/",
  },
  Object {
    "field": "haproxy.server_name",
    "highlights": Array [],
    "value": "docs",
  },
  Object {
    "constant": " \\"",
  },
  Object {
    "field": "haproxy.http.request.raw_request_line",
    "highlights": Array [],
    "value": "GET /component---src-pages-index-js-4b15624544f97cf0bb8f.js HTTP/1.1",
  },
  Object {
    "constant": "\\" ",
  },
  Object {
    "field": "http.response.status_code",
    "highlights": Array [],
    "value": "304",
  },
  Object {
    "constant": " ",
  },
  Object {
    "field": "haproxy.http.request.time_wait_ms",
    "highlights": Array [],
    "value": "0",
  },
  Object {
    "constant": "/",
  },
  Object {
    "field": "event.duration",
    "highlights": Array [],
    "value": "2000000",
  },
  Object {
    "constant": "/",
  },
  Object {
    "field": "haproxy.connection_wait_time_ms",
    "highlights": Array [],
    "value": "1",
  },
  Object {
    "constant": "/",
  },
  Object {
    "field": "haproxy.http.request.time_wait_without_data_ms",
    "highlights": Array [],
    "value": "0",
  },
  Object {
    "constant": "/",
  },
  Object {
    "field": "event.duration",
    "highlights": Array [],
    "value": "2000000",
  },
  Object {
    "constant": " ",
  },
  Object {
    "field": "haproxy.connections.active",
    "highlights": Array [],
    "value": "6",
  },
  Object {
    "constant": "/",
  },
  Object {
    "field": "haproxy.connections.frontend",
    "highlights": Array [],
    "value": "6",
  },
  Object {
    "constant": "/",
  },
  Object {
    "field": "haproxy.connections.backend",
    "highlights": Array [],
    "value": "0",
  },
  Object {
    "constant": "/",
  },
  Object {
    "field": "haproxy.connections.server",
    "highlights": Array [],
    "value": "0",
  },
  Object {
    "constant": "/",
  },
  Object {
    "field": "haproxy.connections.retries",
    "highlights": Array [],
    "value": "0",
  },
  Object {
    "constant": " ",
  },
  Object {
    "field": "haproxy.server_queue",
    "highlights": Array [],
    "value": "0",
  },
  Object {
    "constant": "/",
  },
  Object {
    "field": "haproxy.backend_queue",
    "highlights": Array [],
    "value": "0",
  },
]
`);
    });
  });

  describe('in pre-ECS format', () => {
    test('haproxy default log', () => {
      const flattenedDocument = {
        'event.dataset': 'haproxy.log',
        'fileset.module': 'haproxy',
        'fileset.name': 'log',
        'haproxy.client.ip': '1.2.3.4',
        'haproxy.client.port': '40780',
        'haproxy.destination.ip': '1.2.3.4',
        'haproxy.destination.port': '5000',
        'haproxy.frontend_name': 'main',
        'haproxy.geoip.continent_name': 'North America',
        'haproxy.geoip.country_iso_code': 'US',
        'haproxy.geoip.location.lat': 37.751,
        'haproxy.geoip.location.lon': -97.822,
        'haproxy.mode': 'HTTP',
        'haproxy.pid': '24551',
        'haproxy.process_name': 'haproxy',
        'haproxy.source': '1.2.3.4',
        'input.type': 'log',
        offset: 0,
        'prospector.type': 'log',
      };

      expect(format(flattenedDocument, {})).toMatchInlineSnapshot(`
Array [
  Object {
    "constant": "[HAProxy] ",
  },
  Object {
    "field": "haproxy.client.ip",
    "highlights": Array [],
    "value": "1.2.3.4",
  },
  Object {
    "constant": ":",
  },
  Object {
    "field": "haproxy.client.port",
    "highlights": Array [],
    "value": "40780",
  },
  Object {
    "constant": " ",
  },
  Object {
    "field": "haproxy.frontend_name",
    "highlights": Array [],
    "value": "main",
  },
]
`);
    });

    test('haproxy tcp log', () => {
      const flattenedDocument = {
        'event.dataset': 'haproxy.log',
        'fileset.module': 'haproxy',
        'fileset.name': 'log',
        'haproxy.backend_name': 'app',
        'haproxy.backend_queue': 0,
        'haproxy.bytes_read': 212,
        'haproxy.client.ip': '127.0.0.1',
        'haproxy.client.port': 40962,
        'haproxy.connection_wait_time_ms': -1,
        'haproxy.connections.active': 1,
        'haproxy.connections.backend': 0,
        'haproxy.connections.frontend': 1,
        'haproxy.connections.retries': 0,
        'haproxy.connections.server': 0,
        'haproxy.frontend_name': 'main',
        'haproxy.pid': 25457,
        'haproxy.process_name': 'haproxy',
        'haproxy.server_name': '<NOSRV>',
        'haproxy.server_queue': 0,
        'haproxy.source': '127.0.0.1',
        'haproxy.tcp.processing_time_ms': 0,
        'haproxy.termination_state': 'SC',
        'haproxy.total_waiting_time_ms': -1,
        'input.type': 'log',
        offset: 0,
        'prospector.type': 'log',
      };

      expect(format(flattenedDocument, {})).toMatchInlineSnapshot(`
Array [
  Object {
    "constant": "[HAProxy][tcp] ",
  },
  Object {
    "field": "haproxy.client.ip",
    "highlights": Array [],
    "value": "127.0.0.1",
  },
  Object {
    "constant": ":",
  },
  Object {
    "field": "haproxy.client.port",
    "highlights": Array [],
    "value": "40962",
  },
  Object {
    "constant": " ",
  },
  Object {
    "field": "haproxy.frontend_name",
    "highlights": Array [],
    "value": "main",
  },
  Object {
    "constant": " -> ",
  },
  Object {
    "field": "haproxy.backend_name",
    "highlights": Array [],
    "value": "app",
  },
  Object {
    "constant": "/",
  },
  Object {
    "field": "haproxy.server_name",
    "highlights": Array [],
    "value": "<NOSRV>",
  },
  Object {
    "constant": " ",
  },
  Object {
    "field": "haproxy.connections.active",
    "highlights": Array [],
    "value": "1",
  },
  Object {
    "constant": "/",
  },
  Object {
    "field": "haproxy.connections.frontend",
    "highlights": Array [],
    "value": "1",
  },
  Object {
    "constant": "/",
  },
  Object {
    "field": "haproxy.connections.backend",
    "highlights": Array [],
    "value": "0",
  },
  Object {
    "constant": "/",
  },
  Object {
    "field": "haproxy.connections.server",
    "highlights": Array [],
    "value": "0",
  },
  Object {
    "constant": "/",
  },
  Object {
    "field": "haproxy.connections.retries",
    "highlights": Array [],
    "value": "0",
  },
  Object {
    "constant": " ",
  },
  Object {
    "field": "haproxy.server_queue",
    "highlights": Array [],
    "value": "0",
  },
  Object {
    "constant": "/",
  },
  Object {
    "field": "haproxy.backend_queue",
    "highlights": Array [],
    "value": "0",
  },
]
`);
    });

    test('haproxy http log', () => {
      const flattenedDocument = {
        'event.dataset': 'haproxy.log',
        'fileset.module': 'haproxy',
        'fileset.name': 'log',
        'haproxy.backend_name': 'docs_microservice',
        'haproxy.backend_queue': 0,
        'haproxy.bytes_read': 168,
        'haproxy.client.ip': '1.2.3.4',
        'haproxy.client.port': 38862,
        'haproxy.connection_wait_time_ms': 1,
        'haproxy.connections.active': 6,
        'haproxy.connections.backend': 0,
        'haproxy.connections.frontend': 6,
        'haproxy.connections.retries': 0,
        'haproxy.connections.server': 0,
        'haproxy.frontend_name': 'incoming~',
        'haproxy.geoip.continent_name': 'North America',
        'haproxy.geoip.country_iso_code': 'US',
        'haproxy.geoip.location.lat': 37.751,
        'haproxy.geoip.location.lon': -97.822,
        'haproxy.http.request.captured_cookie': '-',
        'haproxy.http.request.raw_request_line':
          'GET /component---src-pages-index-js-4b15624544f97cf0bb8f.js HTTP/1.1',
        'haproxy.http.request.time_active_ms': 2,
        'haproxy.http.request.time_wait_ms': 0,
        'haproxy.http.request.time_wait_without_data_ms': 0,
        'haproxy.http.response.captured_cookie': '-',
        'haproxy.http.response.status_code': 304,
        'haproxy.pid': 32450,
        'haproxy.process_name': 'haproxy',
        'haproxy.server_name': 'docs',
        'haproxy.server_queue': 0,
        'haproxy.termination_state': '----',
        'haproxy.total_waiting_time_ms': 0,
        'input.type': 'log',
        offset: 0,
        'prospector.type': 'log',
      };

      expect(format(flattenedDocument, {})).toMatchInlineSnapshot(`
Array [
  Object {
    "constant": "[HAProxy][http] ",
  },
  Object {
    "field": "haproxy.client.ip",
    "highlights": Array [],
    "value": "1.2.3.4",
  },
  Object {
    "constant": ":",
  },
  Object {
    "field": "haproxy.client.port",
    "highlights": Array [],
    "value": "38862",
  },
  Object {
    "constant": " ",
  },
  Object {
    "field": "haproxy.frontend_name",
    "highlights": Array [],
    "value": "incoming~",
  },
  Object {
    "constant": " -> ",
  },
  Object {
    "field": "haproxy.backend_name",
    "highlights": Array [],
    "value": "docs_microservice",
  },
  Object {
    "constant": "/",
  },
  Object {
    "field": "haproxy.server_name",
    "highlights": Array [],
    "value": "docs",
  },
  Object {
    "constant": " \\"",
  },
  Object {
    "field": "haproxy.http.request.raw_request_line",
    "highlights": Array [],
    "value": "GET /component---src-pages-index-js-4b15624544f97cf0bb8f.js HTTP/1.1",
  },
  Object {
    "constant": "\\" ",
  },
  Object {
    "field": "haproxy.http.response.status_code",
    "highlights": Array [],
    "value": "304",
  },
  Object {
    "constant": " ",
  },
  Object {
    "field": "haproxy.http.request.time_wait_ms",
    "highlights": Array [],
    "value": "0",
  },
  Object {
    "constant": "/",
  },
  Object {
    "field": "haproxy.total_waiting_time_ms",
    "highlights": Array [],
    "value": "0",
  },
  Object {
    "constant": "/",
  },
  Object {
    "field": "haproxy.connection_wait_time_ms",
    "highlights": Array [],
    "value": "1",
  },
  Object {
    "constant": "/",
  },
  Object {
    "field": "haproxy.http.request.time_wait_without_data_ms",
    "highlights": Array [],
    "value": "0",
  },
  Object {
    "constant": "/",
  },
  Object {
    "field": "haproxy.http.request.time_active_ms",
    "highlights": Array [],
    "value": "2",
  },
  Object {
    "constant": " ",
  },
  Object {
    "field": "haproxy.connections.active",
    "highlights": Array [],
    "value": "6",
  },
  Object {
    "constant": "/",
  },
  Object {
    "field": "haproxy.connections.frontend",
    "highlights": Array [],
    "value": "6",
  },
  Object {
    "constant": "/",
  },
  Object {
    "field": "haproxy.connections.backend",
    "highlights": Array [],
    "value": "0",
  },
  Object {
    "constant": "/",
  },
  Object {
    "field": "haproxy.connections.server",
    "highlights": Array [],
    "value": "0",
  },
  Object {
    "constant": "/",
  },
  Object {
    "field": "haproxy.connections.retries",
    "highlights": Array [],
    "value": "0",
  },
  Object {
    "constant": " ",
  },
  Object {
    "field": "haproxy.server_queue",
    "highlights": Array [],
    "value": "0",
  },
  Object {
    "constant": "/",
  },
  Object {
    "field": "haproxy.backend_queue",
    "highlights": Array [],
    "value": "0",
  },
]
`);
    });
  });
});
