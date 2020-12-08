/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getUptimeESMockClient } from './helper';
import { getNetworkEvents } from '../get_network_events';

describe('getNetworkEvents', () => {
  let mockHits: any;

  beforeEach(() => {
    mockHits = [
      {
        _index: 'heartbeat-2020.12.07',
        _id: 'o5KvPXYBLREsP7x9Y7Gd',
        _score: null,
        _source: {
          '@timestamp': '2020-12-07T14:51:06.572Z',
          monitor: {
            type: 'browser',
            timespan: {
              gte: '2020-12-07T14:51:07.439Z',
              lt: '2020-12-07T14:52:07.439Z',
            },
            check_group: '7f617f79-389b-11eb-80b5-025000000001',
            id: 'BMC-nav',
            name: 'BMC',
          },
          synthetics: {
            journey: {
              id: 'inline',
              name: 'inline',
            },
            type: 'journey/network_info',
            package_version: '0.0.1-alpha.7',
            payload: {
              type: 'Font',
              request: {
                mixed_content_type: 'none',
                initial_priority: 'VeryHigh',
                referrer_policy: 'no-referrer-when-downgrade',
                url:
                  'https://use.typekit.com/af/ce2de8/000000000000000000011f36/27/l?subset_id=2&fvd=n4&v=3',
                method: 'GET',
                headers: {
                  origin: 'https://www.thebmc.co.uk',
                  referer: 'https://www.thebmc.co.uk/volunteers',
                  user_agent:
                    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/88.0.4324.0 Safari/537.36',
                },
              },
              status: 200,
              load_end_time: 11690.378366,
              step: {
                index: 2,
                name: 'Click volunteers link',
              },
              response: {
                mime_type: 'application/font-woff2',
                from_disk_cache: false,
                security_state: 'secure',
                from_service_worker: false,
                url:
                  'https://use.typekit.com/af/ce2de8/000000000000000000011f36/27/l?subset_id=2&fvd=n4&v=3',
                protocol: 'h2',
                connection_reused: true,
                response_time: 1.60735266386276e12,
                status_text: '',
                headers: {
                  timing_allow_origin: '*',
                  content_length: '16620',
                  date: 'Mon, 07 Dec 2020 14:51:03 GMT',
                  server: 'nginx',
                  etag: '"cc13c3aaba9f28fe9e0411f0994b936cf4729475"',
                  content_type: 'application/font-woff2',
                  access_control_allow_origin: '*',
                  cache_control: 'public, max-age=31536000',
                },
                connection_id: 253,
                timing: {
                  push_start: 0,
                  worker_respond_with_settled: -1,
                  dns_end: -1,
                  worker_start: -1,
                  ssl_start: -1,
                  connect_end: -1,
                  receive_headers_end: 56.15,
                  worker_fetch_start: -1,
                  worker_ready: -1,
                  connect_start: -1,
                  send_start: 34.293,
                  proxy_start: -1,
                  send_end: 35.3,
                  request_time: 11687.636845,
                  dns_start: -1,
                  push_end: 0,
                  proxy_end: -1,
                  ssl_end: -1,
                },
                remote_i_p_address: '62.252.188.232',
                encoded_data_length: 16822,
                from_prefetch_cache: false,
                remote_port: 443,
                status: 200,
                security_details: {
                  key_exchange: '',
                  san_list: ['use-staging.typekit.net', 'use.typekit.net', 'use.typekit.com'],
                  issuer: 'DigiCert SHA2 Secure Server CA',
                  cipher: 'AES_256_GCM',
                  subject_name: 'use.typekit.net',
                  protocol: 'TLS 1.3',
                  valid_from: 1580169600,
                  key_exchange_group: 'X25519',
                  certificate_transparency_compliance: 'unknown',
                  signed_certificate_timestamp_list: [],
                  valid_to: 1643716800,
                  certificate_id: 0,
                },
              },
              url:
                'https://use.typekit.com/af/ce2de8/000000000000000000011f36/27/l?subset_id=2&fvd=n4&v=3',
              request_sent_time: 11690.378291,
              is_navigation_request: false,
              method: 'GET',
              timestamp: 1.6073526665725272e15,
            },
            step: {
              index: 2,
              name: 'Click volunteers link',
            },
          },
          event: {
            dataset: 'uptime',
          },
          ecs: {
            version: '1.6.0',
          },
          agent: {
            ephemeral_id: '5bcee4d8-a1ff-416d-9110-e9d67959fcfa',
            id: '4031f8f1-b015-4f2e-8995-42852ff49339',
            name: 'docker-desktop',
            type: 'heartbeat',
            version: '8.0.0',
          },
        },
        sort: [1607352666572],
      },
      {
        _index: 'heartbeat-2020.12.07',
        _id: 'pJKvPXYBLREsP7x9Y7Gd',
        _score: null,
        _source: {
          '@timestamp': '2020-12-07T14:51:06.572Z',
          synthetics: {
            payload: {
              load_end_time: 11690.378555,
              is_navigation_request: false,
              timestamp: 1607352666572586,
              step: {
                name: 'Click volunteers link',
                index: 2,
              },
              url:
                'https://use.typekit.com/af/12aedb/000000000000000000011f38/27/l?subset_id=2&fvd=n7&v=3',
              request: {
                method: 'GET',
                headers: {
                  user_agent:
                    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/88.0.4324.0 Safari/537.36',
                  origin: 'https://www.thebmc.co.uk',
                  referer: 'https://www.thebmc.co.uk/volunteers',
                },
                mixed_content_type: 'none',
                initial_priority: 'VeryHigh',
                referrer_policy: 'no-referrer-when-downgrade',
                url:
                  'https://use.typekit.com/af/12aedb/000000000000000000011f38/27/l?subset_id=2&fvd=n7&v=3',
              },
              status: 200,
              response: {
                status_text: '',
                from_prefetch_cache: false,
                timing: {
                  worker_fetch_start: -1,
                  send_start: 33.679,
                  ssl_start: -1,
                  worker_start: -1,
                  send_end: 34.725,
                  dns_start: -1,
                  connect_start: -1,
                  worker_ready: -1,
                  proxy_end: -1,
                  worker_respond_with_settled: -1,
                  receive_headers_end: 53.931,
                  push_start: 0,
                  connect_end: -1,
                  dns_end: -1,
                  push_end: 0,
                  ssl_end: -1,
                  proxy_start: -1,
                  request_time: 11687.637418,
                },
                protocol: 'h2',
                remote_port: 443,
                security_details: {
                  certificate_transparency_compliance: 'unknown',
                  signed_certificate_timestamp_list: [],
                  key_exchange_group: 'X25519',
                  cipher: 'AES_256_GCM',
                  protocol: 'TLS 1.3',
                  valid_from: 1580169600,
                  key_exchange: '',
                  subject_name: 'use.typekit.net',
                  certificate_id: 0,
                  san_list: ['use-staging.typekit.net', 'use.typekit.net', 'use.typekit.com'],
                  issuer: 'DigiCert SHA2 Secure Server CA',
                  valid_to: 1643716800,
                },
                connection_id: 253,
                status: 200,
                response_time: 1.607352663861158e12,
                from_disk_cache: false,
                connection_reused: true,
                security_state: 'secure',
                encoded_data_length: 16986,
                mime_type: 'application/font-woff2',
                from_service_worker: false,
                remote_i_p_address: '62.252.188.232',
                headers: {
                  content_type: 'application/font-woff2',
                  access_control_allow_origin: '*',
                  cache_control: 'public, max-age=31536000',
                  timing_allow_origin: '*',
                  content_length: '16784',
                  date: 'Mon, 07 Dec 2020 14:51:03 GMT',
                  server: 'nginx',
                  etag: '"c0994501e4f56e0b83223f5c4a96d4b3fdcfe17c"',
                },
                url:
                  'https://use.typekit.com/af/12aedb/000000000000000000011f38/27/l?subset_id=2&fvd=n7&v=3',
              },
              method: 'GET',
              type: 'Font',
              request_sent_time: 11690.378482,
            },
            step: {
              index: 2,
              name: 'Click volunteers link',
            },
            journey: {
              id: 'inline',
              name: 'inline',
            },
            type: 'journey/network_info',
            package_version: '0.0.1-alpha.7',
          },
          monitor: {
            timespan: {
              gte: '2020-12-07T14:51:07.439Z',
              lt: '2020-12-07T14:52:07.439Z',
            },
            check_group: '7f617f79-389b-11eb-80b5-025000000001',
            id: 'BMC-nav',
            name: 'BMC',
            type: 'browser',
          },
          event: {
            dataset: 'uptime',
          },
          ecs: {
            version: '1.6.0',
          },
          agent: {
            ephemeral_id: '5bcee4d8-a1ff-416d-9110-e9d67959fcfa',
            id: '4031f8f1-b015-4f2e-8995-42852ff49339',
            name: 'docker-desktop',
            type: 'heartbeat',
            version: '8.0.0',
          },
        },
        sort: [1607352666572],
      },
    ];
  });

  it('Uses the correct query', async () => {
    const { uptimeEsClient, esClient } = getUptimeESMockClient();

    esClient.search.mockResolvedValueOnce({
      body: {
        hits: {
          hits: mockHits,
        },
      },
    } as any);

    await getNetworkEvents({
      uptimeEsClient,
      checkGroup: 'my-fake-group',
      stepIndex: '1',
    });

    expect(esClient.search.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          Object {
            "body": Object {
              "query": Object {
                "bool": Object {
                  "filter": Array [
                    Object {
                      "term": Object {
                        "synthetics.type": "journey/network_info",
                      },
                    },
                    Object {
                      "term": Object {
                        "monitor.check_group": "my-fake-group",
                      },
                    },
                    Object {
                      "term": Object {
                        "synthetics.step.index": 1,
                      },
                    },
                  ],
                },
              },
              "size": 1000,
            },
            "index": "heartbeat-8*",
          },
        ],
      ]
    `);
  });

  it('Returns the correct result', async () => {
    const { esClient, uptimeEsClient } = getUptimeESMockClient();

    esClient.search.mockResolvedValueOnce({
      body: {
        hits: {
          hits: mockHits,
        },
      },
    } as any);

    const result = await getNetworkEvents({
      uptimeEsClient,
      checkGroup: 'my-fake-group',
      stepIndex: '1',
    });

    expect(result).toMatchInlineSnapshot(`
      Array [
        Object {
          "loadEndTime": 11690378.366,
          "method": "GET",
          "mimeType": "application/font-woff2",
          "requestSentTime": 11690378.291000001,
          "requestStartTime": 11687636.845,
          "status": 200,
          "timestamp": "2020-12-07T14:51:06.572Z",
          "timings": Object {
            "connect_end": -1,
            "connect_start": -1,
            "dns_end": -1,
            "dns_start": -1,
            "proxy_end": -1,
            "proxy_start": -1,
            "push_end": 0,
            "push_start": 0,
            "receive_headers_end": 56.15,
            "request_time": 11687.636845,
            "send_end": 35.3,
            "send_start": 34.293,
            "ssl_end": -1,
            "ssl_start": -1,
            "worker_fetch_start": -1,
            "worker_ready": -1,
            "worker_respond_with_settled": -1,
            "worker_start": -1,
          },
          "url": "https://use.typekit.com/af/ce2de8/000000000000000000011f36/27/l?subset_id=2&fvd=n4&v=3",
        },
        Object {
          "loadEndTime": 11690378.555,
          "method": "GET",
          "mimeType": "application/font-woff2",
          "requestSentTime": 11690378.482,
          "requestStartTime": 11687637.418,
          "status": 200,
          "timestamp": "2020-12-07T14:51:06.572Z",
          "timings": Object {
            "connect_end": -1,
            "connect_start": -1,
            "dns_end": -1,
            "dns_start": -1,
            "proxy_end": -1,
            "proxy_start": -1,
            "push_end": 0,
            "push_start": 0,
            "receive_headers_end": 53.931,
            "request_time": 11687.637418,
            "send_end": 34.725,
            "send_start": 33.679,
            "ssl_end": -1,
            "ssl_start": -1,
            "worker_fetch_start": -1,
            "worker_ready": -1,
            "worker_respond_with_settled": -1,
            "worker_start": -1,
          },
          "url": "https://use.typekit.com/af/12aedb/000000000000000000011f38/27/l?subset_id=2&fvd=n7&v=3",
        },
      ]
    `);
  });
});
