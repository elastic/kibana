/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { InfraMetadata } from '../../../../../../common/http_api';

export const HOST_ID = 'host-1';
export const hostMetadata: InfraMetadata = {
  id: HOST_ID,
  name: HOST_ID,
  info: {
    agent: {
      version: '8.5.0',
    },
    host: {
      hostname: 'Host 1',
      ip: [
        '11.128.0.17',
        'test::4001:fff:test:11',
        '169.254.123.1',
        '11.22.33.44',
        'test::d8d1:123:frr4:ae6d',
        '11.22.33.44',
        'test::8ce7:80ff:fe33:7a75',
        '11.22.33.44',
        'test::800f:ebff:fecc:f658',
        '11.22.33.44',
        'test::3333:asdf:fe1a:72e0',
        '11.22.33.44',
        'test::c0c8:e8ff:fec5:1234',
        '11.22.33.44',
        'test::ccbf:4fff:fe3a:6574',
        '11.22.33.44',
        'test::2222:53ff:asdf:5sda',
        '11.22.33.44',
        'test::cdb:14ff:asdf:5666',
        '11.22.33.44',
        'test::11ba:3dff:asdf:d666',
        '11.22.33.44',
        'test::ece8:eeee:2342:d334',
        '11.22.33.44',
        'test::2402:d6ff:fe73:1234',
      ],
      os: {
        family: 'debian',
        name: 'Ubuntu',
        platform: 'ubuntu',
        version: '5.15.65+',
      },
    },
    cloud: {
      provider: 'gcp',
      availability_zone: 'us-central1-c',
      machine: {
        type: 'n1-standard-4',
      },
    },
  },
  features: [],
};

export const metadataHttpResponse = {
  default: () => Promise.resolve({ ...hostMetadata }),
  loading: () => new Promise(() => {}),
  noData: () => Promise.resolve({ id: 'host-2', name: 'host-2', features: [] }),
  error: () =>
    new Promise(() => {
      throw new Error('err');
    }),
};

export type MetadataResponseMocks = keyof typeof metadataHttpResponse;
