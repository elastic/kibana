/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { NetworkHttpData } from '../../../../graphql/types';

export const mockData: { NetworkHttp: NetworkHttpData } = {
  NetworkHttp: {
    edges: [
      {
        node: {
          _id: '/computeMetadata/v1/instance/virtual-clock/drift-token',
          domains: ['metadata.google.internal'],
          methods: ['get'],
          statuses: [],
          lastHost: 'suricata-iowa',
          lastSourceIp: '10.128.0.21',
          path: '/computeMetadata/v1/instance/virtual-clock/drift-token',
          requestCount: 1440,
        },
        cursor: {
          value: '/computeMetadata/v1/instance/virtual-clock/drift-token',
          tiebreaker: null,
        },
      },
      {
        node: {
          _id: '/computeMetadata/v1/',
          domains: ['metadata.google.internal'],
          methods: ['get'],
          statuses: ['200'],
          lastHost: 'suricata-iowa',
          lastSourceIp: '10.128.0.21',
          path: '/computeMetadata/v1/',
          requestCount: 1020,
        },
        cursor: {
          value: '/computeMetadata/v1/',
          tiebreaker: null,
        },
      },
      {
        node: {
          _id: '/computeMetadata/v1/instance/network-interfaces/',
          domains: ['metadata.google.internal'],
          methods: ['get'],
          statuses: [],
          lastHost: 'suricata-iowa',
          lastSourceIp: '10.128.0.21',
          path: '/computeMetadata/v1/instance/network-interfaces/',
          requestCount: 960,
        },
        cursor: {
          value: '/computeMetadata/v1/instance/network-interfaces/',
          tiebreaker: null,
        },
      },
      {
        node: {
          _id: '/downloads/ca_setup.exe',
          domains: ['www.oxid.it'],
          methods: ['get'],
          statuses: ['200'],
          lastHost: 'jessie',
          lastSourceIp: '10.0.2.15',
          path: '/downloads/ca_setup.exe',
          requestCount: 3,
        },
        cursor: {
          value: '/downloads/ca_setup.exe',
          tiebreaker: null,
        },
      },
    ],
    inspect: {
      dsl: [''],
      response: [''],
    },
    pageInfo: {
      activePage: 0,
      fakeTotalCount: 4,
      showMorePagesIndicator: false,
    },
    totalCount: 4,
  },
};
