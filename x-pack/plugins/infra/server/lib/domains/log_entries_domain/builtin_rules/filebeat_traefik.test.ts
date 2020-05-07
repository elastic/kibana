/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { compileFormattingRules } from '../message';
import { filebeatTraefikRules } from './filebeat_traefik';

const { format } = compileFormattingRules(filebeatTraefikRules);

describe('Filebeat Rules', () => {
  describe('in pre-ECS format', () => {
    test('traefik access log', () => {
      const flattenedDocument = {
        '@timestamp': '2017-10-02T20:22:08.000Z',
        'event.dataset': 'traefik.access',
        'fileset.module': 'traefik',
        'fileset.name': 'access',
        'input.type': 'log',
        offset: 280,
        'prospector.type': 'log',
        'traefik.access.backend_url': 'http://172.19.0.3:5601',
        'traefik.access.body_sent.bytes': 0,
        'traefik.access.duration': 3,
        'traefik.access.frontend_name': 'Host-host1',
        'traefik.access.geoip.city_name': 'Berlin',
        'traefik.access.geoip.continent_name': 'Europe',
        'traefik.access.geoip.country_iso_code': 'DE',
        'traefik.access.geoip.location.lat': 52.4908,
        'traefik.access.geoip.location.lon': 13.3275,
        'traefik.access.geoip.region_iso_code': 'DE-BE',
        'traefik.access.geoip.region_name': 'Land Berlin',
        'traefik.access.http_version': '1.1',
        'traefik.access.method': 'GET',
        'traefik.access.referrer': 'http://example.com/login',
        'traefik.access.remote_ip': '85.181.35.98',
        'traefik.access.request_count': 271,
        'traefik.access.response_code': '304',
        'traefik.access.url': '/ui/favicons/favicon.ico',
        'traefik.access.user_agent.device': 'Other',
        'traefik.access.user_agent.major': '61',
        'traefik.access.user_agent.minor': '0',
        'traefik.access.user_agent.name': 'Chrome',
        'traefik.access.user_agent.original':
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36',
        'traefik.access.user_agent.os': 'Linux',
        'traefik.access.user_agent.os_name': 'Linux',
        'traefik.access.user_agent.patch': '3163',
        'traefik.access.user_identifier': '-',
        'traefik.access.user_name': '-',
      };

      expect(format(flattenedDocument, {})).toMatchInlineSnapshot(`
Array [
  Object {
    "constant": "[traefik][access] ",
  },
  Object {
    "field": "traefik.access.remote_ip",
    "highlights": Array [],
    "value": "85.181.35.98",
  },
  Object {
    "constant": " ",
  },
  Object {
    "field": "traefik.access.frontend_name",
    "highlights": Array [],
    "value": "Host-host1",
  },
  Object {
    "constant": " -> ",
  },
  Object {
    "field": "traefik.access.backend_url",
    "highlights": Array [],
    "value": "http://172.19.0.3:5601",
  },
  Object {
    "constant": " \\"",
  },
  Object {
    "field": "traefik.access.method",
    "highlights": Array [],
    "value": "GET",
  },
  Object {
    "constant": " ",
  },
  Object {
    "field": "traefik.access.url",
    "highlights": Array [],
    "value": "/ui/favicons/favicon.ico",
  },
  Object {
    "constant": " HTTP/",
  },
  Object {
    "field": "traefik.access.http_version",
    "highlights": Array [],
    "value": "1.1",
  },
  Object {
    "constant": "\\" ",
  },
  Object {
    "field": "traefik.access.response_code",
    "highlights": Array [],
    "value": "304",
  },
  Object {
    "constant": " ",
  },
  Object {
    "field": "traefik.access.body_sent.bytes",
    "highlights": Array [],
    "value": "0",
  },
]
`);
    });
  });
});
