/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getUptimeESMockClient } from './helper';
import { getNetworkEvents } from './get_network_events';

describe('getNetworkEvents', () => {
  let mockHits: any;

  beforeEach(() => {
    mockHits = [
      {
        _index: 'heartbeat-2020.12.14',
        _id: 'YMfcYHYBOm8nKLizQt1o',
        _score: null,
        _source: {
          '@timestamp': '2020-12-14T10:46:39.183Z',
          synthetics: {
            step: {
              name: 'Click next link',
              index: 2,
            },
            journey: {
              name: 'inline',
              id: 'inline',
            },
            type: 'journey/network_info',
            package_version: '0.0.1-alpha.8',
            payload: {
              load_end_time: 3287.298251,
              response_received_time: 3287.299074,
              method: 'GET',
              step: {
                index: 2,
                name: 'Click next link',
              },
              status: 200,
              type: 'Image',
              request_sent_time: 3287.154973,
              url: 'www.test.com',
              request: {
                initial_priority: 'Low',
                referrer_policy: 'no-referrer-when-downgrade',
                url: 'www.test.com',
                method: 'GET',
                headers: {
                  referer: 'www.test.com',
                  user_agent:
                    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/88.0.4324.0 Safari/537.36',
                },
                mixed_content_type: 'none',
              },
              response: {
                from_service_worker: false,
                security_details: {
                  protocol: 'TLS 1.2',
                  key_exchange: 'ECDHE_RSA',
                  valid_to: 1638230399,
                  certificate_transparency_compliance: 'unknown',
                  cipher: 'AES_128_GCM',
                  issuer: 'DigiCert TLS RSA SHA256 2020 CA1',
                  subject_name: 'syndication.twitter.com',
                  valid_from: 1606694400,
                  signed_certificate_timestamp_list: [],
                  key_exchange_group: 'P-256',
                  san_list: [
                    'syndication.twitter.com',
                    'syndication.twimg.com',
                    'cdn.syndication.twitter.com',
                    'cdn.syndication.twimg.com',
                    'syndication-o.twitter.com',
                    'syndication-o.twimg.com',
                  ],
                  certificate_id: 0,
                },
                security_state: 'secure',
                connection_reused: true,
                remote_port: 443,
                timing: {
                  ssl_start: -1,
                  send_start: 0.214,
                  ssl_end: -1,
                  connect_start: -1,
                  connect_end: -1,
                  send_end: 0.402,
                  dns_start: -1,
                  request_time: 3287.155502,
                  push_end: 0,
                  worker_fetch_start: -1,
                  worker_ready: -1,
                  worker_start: -1,
                  proxy_end: -1,
                  push_start: 0,
                  worker_respond_with_settled: -1,
                  proxy_start: -1,
                  dns_end: -1,
                  receive_headers_end: 142.215,
                },
                connection_id: 852,
                remote_i_p_address: '104.244.42.200',
                encoded_data_length: 337,
                response_time: 1.60794279932414e12,
                from_prefetch_cache: false,
                mime_type: 'image/gif',
                from_disk_cache: false,
                url: 'www.test.com',
                protocol: 'h2',
                headers: {
                  x_frame_options: 'SAMEORIGIN',
                  cache_control: 'no-cache, no-store, must-revalidate, pre-check=0, post-check=0',
                  strict_transport_security: 'max-age=631138519',
                  x_twitter_response_tags: 'BouncerCompliant',
                  content_type: 'image/gif;charset=utf-8',
                  expires: 'Tue, 31 Mar 1981 05:00:00 GMT',
                  date: 'Mon, 14 Dec 2020 10:46:39 GMT',
                  x_transaction: '008fff3d00a1e64c',
                  x_connection_hash: 'cb6fe99b8676f4e4b827cc3e6512c90d',
                  last_modified: 'Mon, 14 Dec 2020 10:46:39 GMT',
                  x_content_type_options: 'nosniff',
                  content_encoding: 'gzip',
                  x_xss_protection: '0',
                  server: 'tsa_f',
                  x_response_time: '108',
                  pragma: 'no-cache',
                  content_length: '65',
                  status: '200 OK',
                },
                status_text: '',
                status: 200,
              },
              timings: {
                proxy: -1,
                connect: -1,
                receive: 0.5340000002433953,
                blocked: 0.21400000014182297,
                ssl: -1,
                send: 0.18799999998009298,
                total: 143.27800000000934,
                queueing: 0.5289999999149586,
                wait: 141.81299999972907,
                dns: -1,
              },
              is_navigation_request: false,
              timestamp: 1607942799183375,
            },
          },
        },
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
          "loadEndTime": 3287298.251,
          "method": "GET",
          "mimeType": "image/gif",
          "requestSentTime": 3287154.973,
          "requestStartTime": 3287155.502,
          "status": 200,
          "timestamp": "2020-12-14T10:46:39.183Z",
          "timings": Object {
            "blocked": 0.21400000014182297,
            "connect": -1,
            "dns": -1,
            "proxy": -1,
            "queueing": 0.5289999999149586,
            "receive": 0.5340000002433953,
            "send": 0.18799999998009298,
            "ssl": -1,
            "total": 143.27800000000934,
            "wait": 141.81299999972907,
          },
          "url": "www.test.com",
        },
      ]
    `);
  });
});
