/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, fireEvent, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { MonitorTags } from './monitor_tags';
import * as hooks from '../../hooks/use_url_params';
import { renderWithRouter, shallowWithRouter } from '../../lib';

describe('MonitorTags component', () => {
  const summaryPing = {
    monitor_id: 'android-homepage',
    state: {
      timestamp: '2020-12-09T17:08:22.200Z',
      monitor: { name: 'Android Homepage', type: 'http' },
      url: {
        scheme: 'https',
        domain: 'www.android.com',
        port: 443,
        full: 'https://www.android.com',
      },
      summary: { up: 1, down: 0, status: 'up' },
      summaryPings: [
        {
          docId: 'jBR5SHYBjTkd_7K7sM41',
          timestamp: '2020-12-09T17:08:22.200Z',
          '@timestamp': '2020-12-09T17:08:22.200Z',
          observer: {
            geo: { name: 'Europe', location: '51.5074, -0.1278' },
          },
          tls: {
            server: {
              hash: {
                sha1: 'be647fa3de52eba57c89ac297c05604c4af69372',
                sha256: '19321783f8f923a0220cee1599a58203faf4c401ab5728c730ab05a44d9e7a9c',
              },
              x509: {
                subject: {
                  common_name: 'www.android.com',
                  distinguished_name:
                    'CN=www.android.com,O=Google LLC,L=Mountain View,ST=California,C=US',
                },
                serial_number: '264575002113234958015854475703440562297',
                signature_algorithm: 'SHA256-RSA',
                public_key_algorithm: 'ECDSA',
                public_key_curve: 'P-256',
                not_before: '2020-11-03T07:38:14.000Z',
                not_after: '2021-01-26T07:38:14.000Z',
                issuer: {
                  common_name: 'GTS CA 1O1',
                  distinguished_name: 'CN=GTS CA 1O1,O=Google Trust Services,C=US',
                },
              },
            },
            certificate_not_valid_before: '2020-11-03T07:38:14.000Z',
            certificate_not_valid_after: '2021-01-26T07:38:14.000Z',
            established: true,
            cipher: 'TLS-AES-128-GCM-SHA256',
          },
          http: {
            response: {
              headers: {
                Vary: 'Accept-Encoding',
                'X-Content-Type-Options': 'nosniff',
                'Content-Length': '176335',
                'Last-Modified': 'Thu, 03 Dec 2020 21:45:00 GMT',
                'Accept-Ranges': 'bytes',
                Date: 'Wed, 09 Dec 2020 17:08:22 GMT',
                'X-Xss-Protection': '0',
                'Cache-Control': 'private, max-age=0',
                Server: 'sffe',
                'Content-Type': 'text/html',
                Expires: 'Wed, 09 Dec 2020 17:08:22 GMT',
                'Alt-Svc':
                  'h3-29=":443"; ma=2592000,h3-T051=":443"; ma=2592000,h3-Q050=":443"; ma=2592000,h3-Q046=":443"; ma=2592000,h3-Q043=":443"; ma=2592000,quic=":443"; ma=2592000; v="46,43"',
                'Cross-Origin-Resource-Policy': 'cross-origin',
              },
              status_code: 200,
              body: {
                hash: '8367430abf690d75f3c0277b31a16cfcc622e2b315e338f803ae850127d37f48',
                bytes: 176335,
              },
            },
          },
          resolve: { ip: '172.217.16.206', rtt: { us: 7025 } },
          url: {
            scheme: 'https',
            domain: 'www.android.com',
            port: 443,
            full: 'https://www.android.com',
          },
          summary: { up: 1, down: 0 },
          ecs: { version: '1.6.0' },
          agent: {
            type: 'heartbeat',
            version: '8.0.0',
            ephemeral_id: 'a4d0d3eb-d162-4cc7-b14d-eaaad8b3d224',
            id: '1f122196-6a5e-4bd4-8288-ef084e2ec982',
            name: 'Elastic-Mac',
          },
          tcp: { rtt: { connect: { us: 30719 } } },
          monitor: {
            check_group: '12a21140-3a41-11eb-ae8d-a683e72ee74d',
            ip: '172.217.16.206',
            status: 'up',
            duration: { us: 247752 },
            id: 'android-homepage',
            name: 'Android Homepage',
            type: 'http',
            timespan: { gte: '2020-12-09T17:08:22.200Z', lt: '2020-12-09T17:08:52.200Z' },
          },
          tags: ['org:google'],
          event: { dataset: 'uptime' },
        },
      ],
      tls: {
        certificate_not_valid_before: '2020-11-03T07:38:14.000Z',
        certificate_not_valid_after: '2021-01-26T07:38:14.000Z',
        established: true,
        rtt: { handshake: { us: 39344 } },
        version_protocol: 'tls',
        version: '1.3',
        cipher: 'TLS-AES-128-GCM-SHA256',
      },
      observer: { geo: { name: ['Europe'] } },
    },
    minInterval: 75000,
  };

  beforeAll(() => {
    jest.spyOn(hooks, 'useGetUrlParams').mockReturnValue({} as any);
    jest.spyOn(hooks, 'useUrlParams').mockReturnValue([
      () => {
        return {};
      },
      () => {},
    ] as any);
  });

  it('render against summary', () => {
    const component = shallowWithRouter(<MonitorTags summary={summaryPing} />);
    expect(component).toMatchSnapshot();
  });

  it('renders against ping', () => {
    const component = shallowWithRouter(<MonitorTags ping={summaryPing.state.summaryPings[0]} />);
    expect(component).toMatchSnapshot();
  });

  it('it shows expand tag on too many tags', () => {
    summaryPing.state.summaryPings[0].tags = ['red', 'green', 'blue', 'black', 'purple', 'yellow'];
    const component = renderWithRouter(<MonitorTags ping={summaryPing.state.summaryPings[0]} />);
    expect(component).toMatchSnapshot();
    const tags = component.find('.euiBadge');
    expect(tags).toHaveLength(6);
  });

  it('expand tag show tags on click', () => {
    summaryPing.state.summaryPings[0].tags = ['red', 'green', 'blue', 'black', 'purple', 'yellow'];
    render(<MonitorTags ping={summaryPing.state.summaryPings[0]} />, { wrapper: MemoryRouter });

    fireEvent.click(screen.getByText('+1'));

    expect(screen.getByText('yellow')).toHaveTextContent('yellow');
  });
});
