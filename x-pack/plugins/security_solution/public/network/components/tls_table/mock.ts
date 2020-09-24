/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { NetworkTlsStrategyResponse } from '../../../../common/search_strategy';

export const mockTlsData: NetworkTlsStrategyResponse = {
  totalCount: 2,
  edges: [
    {
      node: {
        _id: '2fe3bdf168af35b9e0ce5dc583bab007c40d47de',
        subjects: ['*.elastic.co'],
        ja3: ['7851693188210d3b271aa1713d8c68c2', 'fb4726d465c5f28b84cd6d14cedd13a7'],
        issuers: ['DigiCert SHA2 Secure Server CA'],
        notAfter: ['2021-04-22T12:00:00.000Z'],
      },
      cursor: {
        value: '2fe3bdf168af35b9e0ce5dc583bab007c40d47de',
      },
    },
    {
      node: {
        _id: '61749734b3246f1584029deb4f5276c64da00ada',
        subjects: ['api.snapcraft.io'],
        ja3: ['839868ad711dc55bde0d37a87f14740d'],
        issuers: ['DigiCert SHA2 Secure Server CA'],
        notAfter: ['2019-05-22T12:00:00.000Z'],
      },
      cursor: {
        value: '61749734b3246f1584029deb4f5276c64da00ada',
      },
    },
    {
      node: {
        _id: '6560d3b7dd001c989b85962fa64beb778cdae47a',
        subjects: ['changelogs.ubuntu.com'],
        ja3: ['da12c94da8021bbaf502907ad086e7bc'],
        issuers: ["Let's Encrypt Authority X3"],
        notAfter: ['2019-06-27T01:09:59.000Z'],
      },
      cursor: {
        value: '6560d3b7dd001c989b85962fa64beb778cdae47a',
      },
    },
  ],
  pageInfo: {
    activePage: 1,
    fakeTotalCount: 50,
    showMorePagesIndicator: true,
  },
  rawResponse: {} as NetworkTlsStrategyResponse['rawResponse'],
};
