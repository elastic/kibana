/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DomainsData, IpOverviewData } from '../types';

export const mockIpOverviewData: { IpOverview: IpOverviewData } = {
  IpOverview: {
    source: {
      firstSeen: null,
      lastSeen: '2019-02-07T17:19:41.636Z',
      autonomousSystem: { as_org: 'Hello World', asn: 'Hello World', ip: 'Hello World' },
      geo: {
        continent_name: 'Hello World',
        city_name: 'Hello World',
        country_iso_code: 'Hello World',
        country_name: null,
        location: {
          lat: 40.7214,
          lon: -74.0052,
        },
        region_iso_code: 'Hello World',
        region_name: 'Hello World',
      },
      host: {
        os: {
          name: 'Raspbian GNU/Linux',
          family: '',
          kernel: '4.14.50-v7+',
          version: '9 (stretch)',
          platform: 'raspbian',
        },
        name: 'raspberrypi',
        id: 'b19a781f683541a7a25ee345133aa399',
        ip: ['Hello World', 'Hello World'],
        mac: ['Hello World', 'Hello World'],
        architecture: 'armv7l',
        type: 'Hello World',
      },
    },
    destination: {
      firstSeen: '2019-02-07T17:19:41.648Z',
      lastSeen: '2019-02-07T17:19:41.648Z',
      autonomousSystem: { as_org: 'Hello World', asn: 'Hello World', ip: 'Hello World' },
      geo: {
        continent_name: 'Hello World',
        city_name: 'Hello World',
        country_iso_code: 'Hello World',
        country_name: null,
        location: {
          lat: 40.7214,
          lon: -74.0052,
        },
        region_iso_code: 'Hello World',
        region_name: 'Hello World',
      },
      host: {
        os: {
          name: 'Raspbian GNU/Linux',
          family: '',
          kernel: '4.14.50-v7+',
          version: '9 (stretch)',
          platform: 'raspbian',
        },
        ip: ['Hello World', 'Hello World'],
        mac: ['Hello World', 'Hello World'],
        name: 'raspberrypi',
        id: 'b19a781f683541a7a25ee345133aa399',
        architecture: 'armv7l',
        type: 'Hello World',
      },
    },
  },
};

export const mockDomainsData: { Domains: DomainsData } = {
  Domains: {
    edges: [
      {
        node: {
          _id: 'mirrors.digitalocean.com',
          source: {
            uniqueIpCount: 1,
            domainName: 'mirrors.digitalocean.com',
          },
          network: {
            bytes: 0,
            packets: 0,
            direction: [],
          },
        },
        cursor: {
          value: 'mirrors.digitalocean.com',
          tiebreaker: null,
        },
      },
      {
        node: {
          _id: 'security.ubuntu.com',
          source: {
            uniqueIpCount: 1,
            domainName: 'security.ubuntu.com',
          },
          network: {
            bytes: 0,
            packets: 0,
            direction: [],
          },
        },
        cursor: {
          value: 'security.ubuntu.com',
          tiebreaker: null,
        },
      },
    ],
    totalCount: 2,
    pageInfo: {
      hasNextPage: false,
      endCursor: {
        value: '10',
        tiebreaker: null,
      },
    },
  },
};
