/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Location } from 'history';
import { Transaction } from 'x-pack/plugins/apm/typings/es_schemas/Transaction';

const transaction: Transaction = {
  agent: {
    name: '227453131a17',
    version: '7.0.0'
  },
  processor: {
    name: 'transaction',
    event: 'transaction'
  },
  trace: {
    id: '8b60bd32ecc6e1506735a8b6cfcf175c'
  },
  '@timestamp': '2018-12-18T00:14:30.952Z',
  host: {
    hostname: '227453131a17'
  },
  service: {
    framework: {
      name: 'gin',
      version: 'v1.4.0-dev'
    },
    name: 'opbeans-go',
    runtime: {
      name: 'gc',
      version: 'go1.10.6'
    },
    language: {
      name: 'go',
      version: 'go1.10.6'
    }
  },
  process: {
    pid: 1,
    title: 'opbeans-go',
    args: [
      '/opbeans-go',
      '-listen=:3000',
      '-frontend=/opbeans-frontend',
      '-db=postgres:',
      '-cache=redis://redis:6379'
    ],
    ppid: 0
  },
  transaction: {
    result: 'HTTP 2xx',
    duration: {
      us: 14586403
    },
    name: 'GET /api/products/:id/customers',
    span_count: {
      dropped: 0,
      started: 1
    },
    id: '8b60bd32ecc6e150',
    type: 'request',
    sampled: true
  },
  kubernetes: {
    pod: {
      uid: 'pod123456abcdef'
    }
  },
  container: {
    id: 'container123456abcdef'
  },
  timestamp: {
    us: 1545092070952472
  }
};

const location: Location = {
  state: '',
  pathname:
    '/opbeans-go/transactions/request/GET~20~2Fapi~2Fproducts~2F~3Aid~2Fcustomers',
  search: '?_g=()&flyoutDetailTab=undefined&waterfallItemId=8b60bd32ecc6e150',
  hash: ''
};

export const props = {
  transaction,
  location
};
