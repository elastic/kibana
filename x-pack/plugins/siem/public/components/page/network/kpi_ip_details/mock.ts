/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KpiIpDetailsData } from '../../../../graphql/types';

export const mockData: { KpiIpDetails: KpiIpDetailsData } = {
  KpiIpDetails: {
    connections: 246511947,
    hosts: 3,
    sourcePackets: 12927108,
    sourcePacketsHistogram: [
      {
        x: new Date('2019-06-14T00:00:00.000Z').valueOf(),
        y: 1811625,
      },
      {
        x: new Date('2019-06-15T00:00:00.000Z').valueOf(),
        y: 4041503,
      },
    ],
    sourceByte: 81325168682,
    sourceByteHistogram: [
      {
        x: new Date('2019-06-14T00:00:00.000Z').valueOf(),
        y: 11592691523,
      },
      {
        x: new Date('2019-06-15T00:00:00.000Z').valueOf(),
        y: 25511969914,
      },
    ],
    destinationPackets: 0,
    destinationPacketsHistogram: [
      {
        x: new Date('2019-06-14T00:00:00.000Z').valueOf(),
        y: 0,
      },
      {
        x: new Date('2019-06-15T00:00:00.000Z').valueOf(),
        y: 0,
      },
    ],
    destinationByte: 0,
    destinationByteHistogram: [
      {
        x: new Date('2019-06-14T00:00:00.000Z').valueOf(),
        y: 0,
      },
      {
        x: new Date('2019-06-15T00:00:00.000Z').valueOf(),
        y: 0,
      },
    ],
  },
};
