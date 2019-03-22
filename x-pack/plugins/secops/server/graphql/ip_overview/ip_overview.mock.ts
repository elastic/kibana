/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FieldNode } from 'graphql';

import { IpOverviewData } from '../types';

export const mockIpOverviewData: { IpOverviewData: IpOverviewData } = {
  IpOverviewData: {
    source: {
      firstSeen: '2019-02-07T17:19:41.636Z',
      lastSeen: '2019-02-07T17:19:41.636Z',
      geo: {},
      host: {
        os: {
          kernel: '4.14.50-v7+',
          name: 'Raspbian GNU/Linux',
          family: '',
          version: '9 (stretch)',
          platform: 'raspbian',
        },
        name: 'raspberrypi',
        id: 'b19a781f683541a7a25ee345133aa399',
        architecture: 'armv7l',
      },
    },
    destination: {
      firstSeen: '2019-02-07T17:19:41.648Z',
      lastSeen: '2019-02-07T17:19:41.648Z',
      geo: {},
      host: {
        os: {
          kernel: '4.14.50-v7+',
          name: 'Raspbian GNU/Linux',
          family: '',
          version: '9 (stretch)',
          platform: 'raspbian',
        },
        name: 'raspberrypi',
        id: 'b19a781f683541a7a25ee345133aa399',
        architecture: 'armv7l',
      },
    },
  },
};

export const mockIpOverviewFields: FieldNode = {
  kind: 'Field',
  name: {
    kind: 'Name',
    value: 'IpOverview',
  },
  selectionSet: {
    kind: 'SelectionSet',
    selections: [],
  },
};
