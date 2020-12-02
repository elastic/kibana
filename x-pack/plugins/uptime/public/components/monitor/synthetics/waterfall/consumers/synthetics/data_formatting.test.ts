/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { colourPalette } from './data_formatting';

// const TEST_DATA = [
//   {
//     '@timestamp': '2020-10-29T14:55:01.055Z',
//     ecs: {
//       version: '1.6.0',
//     },
//     agent: {
//       type: 'heartbeat',
//       version: '7.10.0',
//       hostname: 'docker-desktop',
//       ephemeral_id: '34179df8-f97c-46a2-9e73-33976d4ac58d',
//       id: '5a03ad5f-cc18-43e8-8f82-6b08b9ceb36a',
//       name: 'docker-desktop',
//     },
//     synthetics: {
//       index: 7,
//       payload: {
//         request: {
//           url: 'https://unpkg.com/director@1.2.8/build/director.js',
//           method: 'GET',
//           headers: {
//             referer: '',
//             user_agent:
//               'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/88.0.4287.0 Safari/537.36',
//           },
//           mixed_content_type: 'none',
//           initial_priority: 'High',
//           referrer_policy: 'no-referrer-when-downgrade',
//         },
//         status: 200,
//         method: 'GET',
//         end: 13902.944973,
//         url: 'https://unpkg.com/director@1.2.8/build/director.js',
//         type: 'Script',
//         is_navigation_request: false,
//         start: 13902.752946,
//         response: {
//           encoded_data_length: 179,
//           protocol: 'h2',
//           headers: {
//             content_encoding: 'br',
//             server: 'cloudflare',
//             age: '94838',
//             cf_cache_status: 'HIT',
//             x_content_type_options: 'nosniff',
//             last_modified: 'Wed, 04 Feb 2015 03:25:28 GMT',
//             cf_ray: '5e9dbc2bdda2e5a7-MAN',
//             content_type: 'application/javascript; charset=utf-8',
//             x_cloud_trace_context: 'eec7acc7a6f96b5353ef0d648bf437ac',
//             expect_ct:
//               'max-age=604800, report-uri="https://report-uri.cloudflare.com/cdn-cgi/beacon/expect-ct"',
//             access_control_allow_origin: '*',
//             vary: 'Accept-Encoding',
//             cache_control: 'public, max-age=31536000',
//             date: 'Thu, 29 Oct 2020 14:55:00 GMT',
//             cf_request_id: '061673ef6b0000e5a7cd07a000000001',
//             etag: 'W/"4f70-NHpXdyWxnckEaeiXalAnXQ+oh4Q"',
//             strict_transport_security: 'max-age=31536000; includeSubDomains; preload',
//           },
//           remote_i_p_address: '104.16.125.175',
//           connection_reused: true,
//           timing: {
//             dns_start: -1,
//             push_end: 0,
//             worker_fetch_start: -1,
//             worker_respond_with_settled: -1,
//             proxy_end: -1,
//             worker_start: -1,
//             worker_ready: -1,
//             send_end: 158.391,
//             connect_end: -1,
//             connect_start: -1,
//             send_start: 157.876,
//             proxy_start: -1,
//             push_start: 0,
//             ssl_end: -1,
//             receive_headers_end: 186.885,
//             ssl_start: -1,
//             request_time: 13902.757525,
//             dns_end: -1,
//           },
//           connection_id: 17,
//           status_text: '',
//           remote_port: 443,
//           status: 200,
//           security_details: {
//             valid_to: 1627905600,
//             certificate_id: 0,
//             key_exchange_group: 'X25519',
//             valid_from: 1596326400,
//             protocol: 'TLS 1.3',
//             issuer: 'Cloudflare Inc ECC CA-3',
//             key_exchange: '',
//             san_list: ['unpkg.com', '*.unpkg.com', 'sni.cloudflaressl.com'],
//             signed_certificate_timestamp_list: [],
//             certificate_transparency_compliance: 'unknown',
//             cipher: 'AES_128_GCM',
//             subject_name: 'sni.cloudflaressl.com',
//           },
//           mime_type: 'application/javascript',
//           url: 'https://unpkg.com/director@1.2.8/build/director.js',
//           from_prefetch_cache: false,
//           from_disk_cache: false,
//           security_state: 'secure',
//           response_time: 1.603983300513211e12,
//           from_service_worker: false,
//         },
//       },
//       journey: {
//         name: 'check that title is present',
//         id: 'check that title is present',
//       },
//       type: 'journey/network_info',
//       package_version: '0.0.1',
//     },
//     monitor: {
//       status: 'up',
//       duration: {
//         us: 24,
//       },
//       id: 'check that title is present',
//       name: 'check that title is present',
//       type: 'browser',
//       timespan: {
//         gte: '2020-10-29T14:55:01.055Z',
//         lt: '2020-10-29T14:56:01.055Z',
//       },
//       check_group: '948d3b6b-19f6-11eb-b237-025000000001',
//     },
//     event: {
//       dataset: 'uptime',
//     },
//   },
//   {
//     '@timestamp': '2020-10-29T14:55:01.055Z',
//     ecs: {
//       version: '1.6.0',
//     },
//     agent: {
//       version: '7.10.0',
//       hostname: 'docker-desktop',
//       ephemeral_id: '34179df8-f97c-46a2-9e73-33976d4ac58d',
//       id: '5a03ad5f-cc18-43e8-8f82-6b08b9ceb36a',
//       name: 'docker-desktop',
//       type: 'heartbeat',
//     },
//     monitor: {
//       check_group: '948d3b6b-19f6-11eb-b237-025000000001',
//       status: 'up',
//       duration: {
//         us: 13,
//       },
//       id: 'check that title is present',
//       name: 'check that title is present',
//       type: 'browser',
//       timespan: {
//         gte: '2020-10-29T14:55:01.055Z',
//         lt: '2020-10-29T14:56:01.055Z',
//       },
//     },
//     synthetics: {
//       journey: {
//         name: 'check that title is present',
//         id: 'check that title is present',
//       },
//       type: 'journey/network_info',
//       package_version: '0.0.1',
//       index: 9,
//       payload: {
//         start: 13902.76168,
//         url: 'file:///opt/examples/todos/app/app.js',
//         method: 'GET',
//         is_navigation_request: false,
//         end: 13902.770133,
//         request: {
//           headers: {
//             referer: '',
//             user_agent:
//               'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/88.0.4287.0 Safari/537.36',
//           },
//           mixed_content_type: 'none',
//           initial_priority: 'High',
//           referrer_policy: 'no-referrer-when-downgrade',
//           url: 'file:///opt/examples/todos/app/app.js',
//           method: 'GET',
//         },
//         status: 0,
//         type: 'Script',
//         response: {
//           protocol: 'file',
//           connection_reused: false,
//           mime_type: 'text/javascript',
//           security_state: 'secure',
//           from_disk_cache: false,
//           url: 'file:///opt/examples/todos/app/app.js',
//           status_text: '',
//           connection_id: 0,
//           from_prefetch_cache: false,
//           encoded_data_length: -1,
//           headers: {},
//           status: 0,
//           from_service_worker: false,
//         },
//       },
//     },
//     event: {
//       dataset: 'uptime',
//     },
//   },
//   {
//     '@timestamp': '2020-10-29T14:55:01.000Z',
//     monitor: {
//       timespan: {
//         lt: '2020-10-29T14:56:01.000Z',
//         gte: '2020-10-29T14:55:01.000Z',
//       },
//       id: 'check that title is present',
//       name: 'check that title is present',
//       check_group: '948d3b6b-19f6-11eb-b237-025000000001',
//       status: 'up',
//       duration: {
//         us: 44365,
//       },
//       type: 'browser',
//     },
//     synthetics: {
//       journey: {
//         id: 'check that title is present',
//         name: 'check that title is present',
//       },
//       type: 'journey/network_info',
//       package_version: '0.0.1',
//       index: 5,
//       payload: {
//         status: 0,
//         url: 'file:///opt/examples/todos/app/index.html',
//         end: 13902.730261,
//         request: {
//           method: 'GET',
//           headers: {},
//           mixed_content_type: 'none',
//           initial_priority: 'VeryHigh',
//           referrer_policy: 'no-referrer-when-downgrade',
//           url: 'file:///opt/examples/todos/app/index.html',
//         },
//         method: 'GET',
//         response: {
//           status: 0,
//           connection_id: 0,
//           from_disk_cache: false,
//           headers: {},
//           encoded_data_length: -1,
//           status_text: '',
//           from_service_worker: false,
//           connection_reused: false,
//           url: 'file:///opt/examples/todos/app/index.html',
//           remote_port: 0,
//           security_state: 'secure',
//           protocol: 'file',
//           mime_type: 'text/html',
//           remote_i_p_address: '',
//           from_prefetch_cache: false,
//         },
//         start: 13902.726626,
//         type: 'Document',
//         is_navigation_request: true,
//       },
//     },
//     event: {
//       dataset: 'uptime',
//     },
//     ecs: {
//       version: '1.6.0',
//     },
//     agent: {
//       ephemeral_id: '34179df8-f97c-46a2-9e73-33976d4ac58d',
//       id: '5a03ad5f-cc18-43e8-8f82-6b08b9ceb36a',
//       name: 'docker-desktop',
//       type: 'heartbeat',
//       version: '7.10.0',
//       hostname: 'docker-desktop',
//     },
//   },
//   {
//     '@timestamp': '2020-10-29T14:55:01.044Z',
//     monitor: {
//       type: 'browser',
//       timespan: {
//         lt: '2020-10-29T14:56:01.044Z',
//         gte: '2020-10-29T14:55:01.044Z',
//       },
//       check_group: '948d3b6b-19f6-11eb-b237-025000000001',
//       status: 'up',
//       duration: {
//         us: 10524,
//       },
//       id: 'check that title is present',
//       name: 'check that title is present',
//     },
//     synthetics: {
//       package_version: '0.0.1',
//       index: 6,
//       payload: {
//         status: 200,
//         type: 'Stylesheet',
//         url: 'https://unpkg.com/todomvc-app-css@2.0.4/index.css',
//         method: 'GET',
//         start: 13902.75266,
//         is_navigation_request: false,
//         end: 13902.943835,
//         response: {
//           remote_i_p_address: '104.16.125.175',
//           response_time: 1.603983300511892e12,
//           url: 'https://unpkg.com/todomvc-app-css@2.0.4/index.css',
//           mime_type: 'text/css',
//           protocol: 'h2',
//           security_state: 'secure',
//           encoded_data_length: 414,
//           remote_port: 443,
//           status_text: '',
//           timing: {
//             proxy_start: -1,
//             worker_ready: -1,
//             worker_fetch_start: -1,
//             receive_headers_end: 189.169,
//             worker_respond_with_settled: -1,
//             connect_end: 160.311,
//             worker_start: -1,
//             send_start: 161.275,
//             dns_start: 0.528,
//             send_end: 161.924,
//             ssl_end: 160.267,
//             proxy_end: -1,
//             ssl_start: 29.726,
//             request_time: 13902.753988,
//             dns_end: 5.212,
//             push_end: 0,
//             push_start: 0,
//             connect_start: 5.212,
//           },
//           connection_reused: false,
//           from_service_worker: false,
//           security_details: {
//             san_list: ['unpkg.com', '*.unpkg.com', 'sni.cloudflaressl.com'],
//             valid_from: 1596326400,
//             cipher: 'AES_128_GCM',
//             protocol: 'TLS 1.3',
//             issuer: 'Cloudflare Inc ECC CA-3',
//             valid_to: 1627905600,
//             certificate_id: 0,
//             key_exchange_group: 'X25519',
//             certificate_transparency_compliance: 'unknown',
//             key_exchange: '',
//             subject_name: 'sni.cloudflaressl.com',
//             signed_certificate_timestamp_list: [],
//           },
//           connection_id: 17,
//           status: 200,
//           from_disk_cache: false,
//           from_prefetch_cache: false,
//           headers: {
//             date: 'Thu, 29 Oct 2020 14:55:00 GMT',
//             x_cloud_trace_context: '76a4f7b8be185f2ac9aa839de3d6f893',
//             cache_control: 'public, max-age=31536000',
//             expect_ct:
//               'max-age=604800, report-uri="https://report-uri.cloudflare.com/cdn-cgi/beacon/expect-ct"',
//             content_type: 'text/css; charset=utf-8',
//             age: '627638',
//             x_content_type_options: 'nosniff',
//             last_modified: 'Sat, 09 Jan 2016 00:57:37 GMT',
//             access_control_allow_origin: '*',
//             cf_request_id: '061673ef6a0000e5a75a309000000001',
//             vary: 'Accept-Encoding',
//             strict_transport_security: 'max-age=31536000; includeSubDomains; preload',
//             cf_ray: '5e9dbc2bdda1e5a7-MAN',
//             content_encoding: 'br',
//             etag: 'W/"1921-kYwbQVnRAA2V/L9Gr4SCtUE5LHQ"',
//             server: 'cloudflare',
//             cf_cache_status: 'HIT',
//           },
//         },
//         request: {
//           headers: {
//             referer: '',
//             user_agent:
//               'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/88.0.4287.0 Safari/537.36',
//           },
//           mixed_content_type: 'none',
//           initial_priority: 'VeryHigh',
//           referrer_policy: 'no-referrer-when-downgrade',
//           url: 'https://unpkg.com/todomvc-app-css@2.0.4/index.css',
//           method: 'GET',
//         },
//       },
//       journey: {
//         id: 'check that title is present',
//         name: 'check that title is present',
//       },
//       type: 'journey/network_info',
//     },
//     event: {
//       dataset: 'uptime',
//     },
//     ecs: {
//       version: '1.6.0',
//     },
//     agent: {
//       version: '7.10.0',
//       hostname: 'docker-desktop',
//       ephemeral_id: '34179df8-f97c-46a2-9e73-33976d4ac58d',
//       id: '5a03ad5f-cc18-43e8-8f82-6b08b9ceb36a',
//       name: 'docker-desktop',
//       type: 'heartbeat',
//     },
//   },
//   {
//     '@timestamp': '2020-10-29T14:55:01.055Z',
//     agent: {
//       ephemeral_id: '34179df8-f97c-46a2-9e73-33976d4ac58d',
//       id: '5a03ad5f-cc18-43e8-8f82-6b08b9ceb36a',
//       name: 'docker-desktop',
//       type: 'heartbeat',
//       version: '7.10.0',
//       hostname: 'docker-desktop',
//     },
//     synthetics: {
//       index: 8,
//       payload: {
//         method: 'GET',
//         type: 'Script',
//         response: {
//           url: 'file:///opt/examples/todos/app/vue.min.js',
//           protocol: 'file',
//           connection_id: 0,
//           headers: {},
//           mime_type: 'text/javascript',
//           from_service_worker: false,
//           status_text: '',
//           connection_reused: false,
//           encoded_data_length: -1,
//           from_disk_cache: false,
//           security_state: 'secure',
//           from_prefetch_cache: false,
//           status: 0,
//         },
//         is_navigation_request: false,
//         request: {
//           mixed_content_type: 'none',
//           initial_priority: 'High',
//           referrer_policy: 'no-referrer-when-downgrade',
//           url: 'file:///opt/examples/todos/app/vue.min.js',
//           method: 'GET',
//           headers: {
//             referer: '',
//             user_agent:
//               'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/88.0.4287.0 Safari/537.36',
//           },
//         },
//         end: 13902.772783,
//         status: 0,
//         start: 13902.760644,
//         url: 'file:///opt/examples/todos/app/vue.min.js',
//       },
//       journey: {
//         name: 'check that title is present',
//         id: 'check that title is present',
//       },
//       type: 'journey/network_info',
//       package_version: '0.0.1',
//     },
//     monitor: {
//       status: 'up',
//       duration: {
//         us: 82,
//       },
//       name: 'check that title is present',
//       type: 'browser',
//       timespan: {
//         gte: '2020-10-29T14:55:01.055Z',
//         lt: '2020-10-29T14:56:01.055Z',
//       },
//       id: 'check that title is present',
//       check_group: '948d3b6b-19f6-11eb-b237-025000000001',
//     },
//     event: {
//       dataset: 'uptime',
//     },
//     ecs: {
//       version: '1.6.0',
//     },
//   },
// ];

// const toMillis = (seconds: number) => seconds * 1000;

// describe('getTimings', () => {
//   it('Calculates timings for network events correctly', () => {
//     // NOTE: Uses these timings as the file protocol events don't have timing information
//     const eventOneTimings = getTimings(
//       TEST_DATA[0].synthetics.payload.response.timing!,
//       toMillis(TEST_DATA[0].synthetics.payload.start),
//       toMillis(TEST_DATA[0].synthetics.payload.end)
//     );
//     expect(eventOneTimings).toEqual({
//       blocked: 162.4549999999106,
//       connect: -1,
//       dns: -1,
//       receive: 0.5629999989271255,
//       send: 0.5149999999999864,
//       ssl: undefined,
//       wait: 28.494,
//     });

//     const eventFourTimings = getTimings(
//       TEST_DATA[3].synthetics.payload.response.timing!,
//       toMillis(TEST_DATA[3].synthetics.payload.start),
//       toMillis(TEST_DATA[3].synthetics.payload.end)
//     );
//     expect(eventFourTimings).toEqual({
//       blocked: 1.8559999997466803,
//       connect: 25.52200000000002,
//       dns: 4.683999999999999,
//       receive: 0.6780000009983667,
//       send: 0.6490000000000009,
//       ssl: 130.541,
//       wait: 27.245000000000005,
//     });
//   });
// });

// describe('getSeriesAndDomain', () => {
//   let seriesAndDomain: any;
//   let NetworkItems: any;

//   beforeAll(() => {
//     NetworkItems = extractItems(TEST_DATA);
//     seriesAndDomain = getSeriesAndDomain(NetworkItems);
//   });

//   it('Correctly calculates the domain', () => {
//     expect(seriesAndDomain.domain).toEqual({ max: 218.34699999913573, min: 0 });
//   });

//   it('Correctly calculates the series', () => {
//     expect(seriesAndDomain.series).toEqual([
//       {
//         config: { colour: '#f3b3a6', tooltipProps: { colour: '#f3b3a6', value: '3.635ms' } },
//         x: 0,
//         y: 3.6349999997764826,
//         y0: 0,
//       },
//       {
//         config: {
//           colour: '#b9a888',
//           tooltipProps: { colour: '#b9a888', value: 'Queued / Blocked: 1.856ms' },
//         },
//         x: 1,
//         y: 27.889999999731778,
//         y0: 26.0339999999851,
//       },
//       {
//         config: { colour: '#54b399', tooltipProps: { colour: '#54b399', value: 'DNS: 4.684ms' } },
//         x: 1,
//         y: 32.573999999731775,
//         y0: 27.889999999731778,
//       },
//       {
//         config: {
//           colour: '#da8b45',
//           tooltipProps: { colour: '#da8b45', value: 'Connecting: 25.522ms' },
//         },
//         x: 1,
//         y: 58.095999999731795,
//         y0: 32.573999999731775,
//       },
//       {
//         config: { colour: '#edc5a2', tooltipProps: { colour: '#edc5a2', value: 'SSL: 130.541ms' } },
//         x: 1,
//         y: 188.63699999973178,
//         y0: 58.095999999731795,
//       },
//       {
//         config: {
//           colour: '#d36086',
//           tooltipProps: { colour: '#d36086', value: 'Sending request: 0.649ms' },
//         },
//         x: 1,
//         y: 189.28599999973179,
//         y0: 188.63699999973178,
//       },
//       {
//         config: {
//           colour: '#b0c9e0',
//           tooltipProps: { colour: '#b0c9e0', value: 'Waiting (TTFB): 27.245ms' },
//         },
//         x: 1,
//         y: 216.5309999997318,
//         y0: 189.28599999973179,
//       },
//       {
//         config: {
//           colour: '#ca8eae',
//           tooltipProps: { colour: '#ca8eae', value: 'Content downloading: 0.678ms' },
//         },
//         x: 1,
//         y: 217.20900000073016,
//         y0: 216.5309999997318,
//       },
//       {
//         config: {
//           colour: '#b9a888',
//           tooltipProps: { colour: '#b9a888', value: 'Queued / Blocked: 162.455ms' },
//         },
//         x: 2,
//         y: 188.77500000020862,
//         y0: 26.320000000298023,
//       },
//       {
//         config: {
//           colour: '#d36086',
//           tooltipProps: { colour: '#d36086', value: 'Sending request: 0.515ms' },
//         },
//         x: 2,
//         y: 189.2900000002086,
//         y0: 188.77500000020862,
//       },
//       {
//         config: {
//           colour: '#b0c9e0',
//           tooltipProps: { colour: '#b0c9e0', value: 'Waiting (TTFB): 28.494ms' },
//         },
//         x: 2,
//         y: 217.7840000002086,
//         y0: 189.2900000002086,
//       },
//       {
//         config: {
//           colour: '#9170b8',
//           tooltipProps: { colour: '#9170b8', value: 'Content downloading: 0.563ms' },
//         },
//         x: 2,
//         y: 218.34699999913573,
//         y0: 217.7840000002086,
//       },
//       {
//         config: { colour: '#9170b8', tooltipProps: { colour: '#9170b8', value: '12.139ms' } },
//         x: 3,
//         y: 46.15699999965727,
//         y0: 34.01799999922514,
//       },
//       {
//         config: { colour: '#9170b8', tooltipProps: { colour: '#9170b8', value: '8.453ms' } },
//         x: 4,
//         y: 43.506999999284744,
//         y0: 35.053999999538064,
//       },
//     ]);
//   });
// });

describe('Palettes', () => {
  it('A colour palette comprising timing and mime type colours is correctly generated', () => {
    expect(colourPalette).toEqual({
      blocked: '#b9a888',
      connect: '#da8b45',
      dns: '#54b399',
      font: '#aa6556',
      html: '#f3b3a6',
      media: '#d6bf57',
      other: '#e7664c',
      receive: '#54b399',
      script: '#9170b8',
      send: '#d36086',
      ssl: '#edc5a2',
      stylesheet: '#ca8eae',
      wait: '#b0c9e0',
    });
  });
});
