/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { render } from '../../../../lib/helper/rtl_helpers';
import { SimpleTestResults } from './simple_test_results';
import { kibanaService } from '../../../../state/kibana_service';
import * as runOnceHooks from './use_simple_run_once_monitors';
import { Ping } from '../../../../../common/runtime_types';

describe('SimpleTestResults', function () {
  const onDone = jest.fn();
  let testId: string;

  beforeEach(() => {
    testId = 'test-id';
    jest.resetAllMocks();
  });

  it('should render properly', async function () {
    render(<SimpleTestResults monitorId={testId} expectPings={1} onDone={onDone} />);
    expect(await screen.findByText('Test result')).toBeInTheDocument();
    const dataApi = (kibanaService.core as any).data.search;

    expect(dataApi.search).toHaveBeenCalledTimes(1);
    expect(dataApi.search).toHaveBeenLastCalledWith(
      {
        params: {
          body: {
            query: {
              bool: {
                filter: [{ term: { config_id: testId } }, { exists: { field: 'summary' } }],
              },
            },
            sort: [{ '@timestamp': 'desc' }],
          },
          index: 'synthetics-*',
          size: 1000,
        },
      },
      {}
    );
  });

  it('should displays results', async function () {
    const doc = data.hits.hits[0];
    jest.spyOn(runOnceHooks, 'useSimpleRunOnceMonitors').mockReturnValue({
      data: data as any,
      summaryDocs: [
        {
          ...(doc._source as unknown as Ping),
          timestamp: (doc._source as unknown as Record<string, string>)?.['@timestamp'],
          docId: doc._id,
        },
      ],
      loading: false,
      lastUpdated: Date.now(),
    });

    render(<SimpleTestResults monitorId={'test-id'} expectPings={1} onDone={onDone} />);

    expect(await screen.findByText('Test result')).toBeInTheDocument();

    expect(await screen.findByText('COMPLETED')).toBeInTheDocument();
    expect(await screen.findByText('191 ms')).toBeInTheDocument();
    expect(await screen.findByText('151.101.2.217')).toBeInTheDocument();
    expect(await screen.findByText('Checked Jan 12, 2022 11:54:27 AM')).toBeInTheDocument();
    expect(await screen.findByText('Took 191 ms')).toBeInTheDocument();

    // Calls onDone on completion
    expect(onDone).toHaveBeenCalled();

    screen.debug();
  });
});

const data = {
  took: 201,
  timed_out: false,
  _shards: { total: 8, successful: 8, skipped: 0, failed: 0 },
  hits: {
    total: 1,
    max_score: null,
    hits: [
      {
        _index: '.ds-synthetics-http-default-2022.01.11-000002',
        _id: '6h42T34BPllLwAMpWCjo',
        _score: null,
        _source: {
          tcp: { rtt: { connect: { us: 11480 } } },
          summary: { up: 1, down: 0 },
          agent: {
            name: 'job-2b730ffa8811ff-knvmz',
            id: 'a3ed3007-4261-40a9-ad08-7a8384cce7f5',
            type: 'heartbeat',
            ephemeral_id: '7ffe97e3-15a3-4d76-960e-8f0488998e3c',
            version: '8.0.0',
          },
          resolve: { rtt: { us: 46753 }, ip: '151.101.2.217' },
          monitor: {
            duration: { us: 191528 },
            ip: '151.101.2.217',
            name: 'Elastic HTTP',
            check_group: '4d7fd600-73c8-11ec-b035-2621090844ff',
            id: 'e5a3a871-b5c3-49cf-a798-3860028e7a6b',
            timespan: { lt: '2022-01-12T16:57:27.443Z', gte: '2022-01-12T16:54:27.443Z' },
            type: 'http',
            status: 'up',
          },
          url: {
            scheme: 'https',
            port: 443,
            domain: 'www.elastic.co',
            full: 'https://www.elastic.co',
          },
          '@timestamp': '2022-01-12T16:54:27.252Z',
          ecs: { version: '8.0.0' },
          config_id: 'e5a3a871-b5c3-49cf-a798-3860028e7a6b',
          data_stream: { namespace: 'default', type: 'synthetics', dataset: 'http' },
          run_once: true,
          http: {
            rtt: {
              response_header: { us: 61231 },
              total: { us: 144630 },
              write_request: { us: 93 },
              content: { us: 25234 },
              validate: { us: 86466 },
            },
            response: {
              headers: {
                'X-Dns-Prefetch-Control': 'off',
                Server: 'my-server',
                'Access-Control-Allow-Origin': '*',
                'X-Timer': 'S1642006467.362040,VS0,VE51',
                'Referrer-Policy': 'strict-origin-when-cross-origin',
                'X-Frame-Options': 'SAMEORIGIN',
                'Strict-Transport-Security': 'max-age=0',
                Etag: '"29d46-xv8YFxCD32Ncbzip9bXU5q9QSvg"',
                'X-Served-By': 'cache-sea4462-SEA, cache-pwk4941-PWK',
                'Content-Security-Policy':
                  "frame-ancestors 'self' https://*.elastic.co https://elasticsandbox.docebosaas.com https://elastic.docebosaas.com https://www.gather.town;",
                'Set-Cookie':
                  'euid=2b70f3d5-56bc-49f1-a64f-50d352914207; Expires=Tuesday, 19 January 2038 01:00:00 GMT; Path=/; Domain=.elastic.co;',
                'X-Change-Language': 'true',
                'Content-Length': '171334',
                Age: '1591',
                'Content-Type': 'text/html; charset=utf-8',
                'X-Powered-By': 'Next.js',
                'X-Cache': 'HIT, MISS',
                'X-Content-Type-Options': 'nosniff',
                'X-Download-Options': 'noopen',
                Date: 'Wed, 12 Jan 2022 16:54:27 GMT',
                Via: '1.1 varnish, 1.1 varnish',
                'Accept-Ranges': 'bytes',
                'Cache-Control': 'max-age=86400',
                'X-Xss-Protection': '1; mode=block',
                Vary: 'Accept-Language, X-Change-Language, Accept-Encoding',
                'Elastic-Vi': '2b70f3d5-56bc-49f1-a64f-50d352914207',
                'X-Cache-Hits': '425, 0',
              },
              status_code: 200,
              mime_type: 'text/html; charset=utf-8',
              body: {
                bytes: 171334,
                hash: '29e5b1a1949dc4d253399874b161049030639d70c5164a5235e039bb4b95f9fd',
              },
            },
          },
          tls: {
            established: true,
            cipher: 'ECDHE-RSA-AES-128-GCM-SHA256',
            certificate_not_valid_before: '2021-11-26T19:42:12.000Z',
            server: {
              x509: {
                not_after: '2022-12-28T19:42:11.000Z',
                public_key_exponent: 65537,
                not_before: '2021-11-26T19:42:12.000Z',
                subject: {
                  distinguished_name: 'CN=www.elastic.co',
                  common_name: 'www.elastic.co',
                },
                public_key_algorithm: 'RSA',
                signature_algorithm: 'SHA256-RSA',
                public_key_size: 2048,
                serial_number: '2487880865947729006738430997169012636',
                issuer: {
                  distinguished_name:
                    'CN=GlobalSign Atlas R3 DV TLS CA H2 2021,O=GlobalSign nv-sa,C=BE',
                  common_name: 'GlobalSign Atlas R3 DV TLS CA H2 2021',
                },
              },
              hash: {
                sha1: '21099729d121d9707ca6c1b642032a97ea2dcb74',
                sha256: '55715c58c7e0939aa9b8989df59082ce33c1b274678e7913fd0c269f33103b02',
              },
            },
            rtt: { handshake: { us: 46409 } },
            version: '1.2',
            certificate_not_valid_after: '2022-12-28T19:42:11.000Z',
            version_protocol: 'tls',
          },
          event: {
            agent_id_status: 'auth_metadata_missing',
            ingested: '2022-01-12T16:54:28Z',
            dataset: 'http',
          },
        },
        sort: [1642006467252],
      },
    ],
  },
};
