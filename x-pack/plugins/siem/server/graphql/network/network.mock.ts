/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FieldNode } from 'graphql';

import { Logger } from '../../utils/logger';
import { SiemContext } from '../index';
import { NetworkDirectionEcs, NetworkDnsData, NetworkTopNFlowData } from '../types';

export const mockNetworkTopNFlowData: { NetworkTopNFlow: NetworkTopNFlowData } = {
  NetworkTopNFlow: {
    totalCount: 469,
    edges: [
      {
        cursor: {
          value: '1.1.1.1',
        },
        node: {
          _id: '1.1.1.1',
          network: {
            bytes: 1532853382,
            packets: 1025631,
            direction: [NetworkDirectionEcs.inbound],
          },
          source: {
            domain: ['test.1.net'],
            ip: '1.1.1.1',
            count: 1,
          },
          destination: { domain: ['Hello World'], ip: 'Hello World' },
        },
      },
      {
        cursor: {
          value: '2.2.2.2',
        },
        node: {
          _id: '2.2.2.2',
          network: {
            bytes: 4208518310,
            packets: 2811441,
            direction: [NetworkDirectionEcs.inbound],
          },
          source: {
            domain: ['test.2.net'],
            ip: '2.2.2.2',
            count: 1,
          },
          destination: { domain: ['Hello World'], ip: 'Hello World' },
        },
      },
    ],
    pageInfo: {
      endCursor: {
        value: '10',
      },
      hasNextPage: true,
    },
  },
};

export const mockNetworkDnsData: { NetworkDns: NetworkDnsData } = {
  NetworkDns: {
    totalCount: 80,
    edges: [
      {
        node: {
          _id: 'nflxvideo.net',
          dnsBytesIn: 2964,
          dnsBytesOut: 12546,
          dnsName: 'nflxvideo.net',
          queryCount: 52,
          uniqueDomains: 21,
        },
        cursor: { value: 'nflxvideo.net' },
      },
      {
        node: {
          _id: 'apple.com',
          dnsBytesIn: 2680,
          dnsBytesOut: 31687,
          dnsName: 'apple.com',
          queryCount: 75,
          uniqueDomains: 20,
        },
        cursor: { value: 'apple.com' },
      },
    ],
    pageInfo: {
      endCursor: { value: '10' },
      hasNextPage: true,
    },
  },
};

export const getNetworkQueryMock = (logger: Logger) => ({
  source: (root: unknown, args: unknown, context: SiemContext) => {
    logger.info('Mock source');
    const operationName = context.req.payload.operationName.toLowerCase();
    switch (operationName) {
      case 'top-n-flow': {
        return mockNetworkTopNFlowData;
      }
      case 'dns': {
        return mockNetworkDnsData;
      }
      default: {
        return {};
      }
    }
  },
});

export const mockNetworkTopNFlowFields: FieldNode = {
  kind: 'Field',
  name: {
    kind: 'Name',
    value: 'NetworkTopNFlow',
  },
  selectionSet: {
    kind: 'SelectionSet',
    selections: [
      {
        kind: 'Field',
        name: {
          kind: 'Name',
          value: 'totalCount',
        },
        arguments: [],
        directives: [],
      },
      {
        kind: 'Field',
        name: {
          kind: 'Name',
          value: 'edges',
        },
        arguments: [],
        directives: [],
        selectionSet: {
          kind: 'SelectionSet',
          selections: [
            {
              kind: 'Field',
              name: {
                kind: 'Name',
                value: 'node',
              },
              arguments: [],
              directives: [],
              selectionSet: {
                kind: 'SelectionSet',
                selections: [
                  {
                    kind: 'Field',
                    name: {
                      kind: 'Name',
                      value: 'source',
                    },
                    arguments: [],
                    directives: [],
                    selectionSet: {
                      kind: 'SelectionSet',
                      selections: [
                        {
                          kind: 'Field',
                          name: {
                            kind: 'Name',
                            value: 'ip',
                          },
                          arguments: [],
                          directives: [],
                        },
                        {
                          kind: 'Field',
                          name: {
                            kind: 'Name',
                            value: 'domain',
                          },
                          arguments: [],
                          directives: [],
                        },
                        {
                          kind: 'Field',
                          name: {
                            kind: 'Name',
                            value: 'count',
                          },
                          arguments: [],
                          directives: [],
                        },
                        {
                          kind: 'Field',
                          name: {
                            kind: 'Name',
                            value: '__typename',
                          },
                          arguments: [],
                          directives: [],
                        },
                      ],
                    },
                  },
                  {
                    kind: 'Field',
                    name: {
                      kind: 'Name',
                      value: 'destination',
                    },
                    arguments: [],
                    directives: [],
                    selectionSet: {
                      kind: 'SelectionSet',
                      selections: [
                        {
                          kind: 'Field',
                          name: {
                            kind: 'Name',
                            value: 'ip',
                          },
                          arguments: [],
                          directives: [],
                        },
                        {
                          kind: 'Field',
                          name: {
                            kind: 'Name',
                            value: 'domain',
                          },
                          arguments: [],
                          directives: [],
                        },
                        {
                          kind: 'Field',
                          name: {
                            kind: 'Name',
                            value: 'count',
                          },
                          arguments: [],
                          directives: [],
                        },
                        {
                          kind: 'Field',
                          name: {
                            kind: 'Name',
                            value: '__typename',
                          },
                          arguments: [],
                          directives: [],
                        },
                      ],
                    },
                  },
                  {
                    kind: 'Field',
                    name: {
                      kind: 'Name',
                      value: 'network',
                    },
                    arguments: [],
                    directives: [],
                    selectionSet: {
                      kind: 'SelectionSet',
                      selections: [
                        {
                          kind: 'Field',
                          name: {
                            kind: 'Name',
                            value: 'bytes',
                          },
                          arguments: [],
                          directives: [],
                        },
                        {
                          kind: 'Field',
                          name: {
                            kind: 'Name',
                            value: 'packets',
                          },
                          arguments: [],
                          directives: [],
                        },
                        {
                          kind: 'Field',
                          name: {
                            kind: 'Name',
                            value: 'direction',
                          },
                          arguments: [],
                          directives: [],
                        },
                        {
                          kind: 'Field',
                          name: {
                            kind: 'Name',
                            value: '__typename',
                          },
                          arguments: [],
                          directives: [],
                        },
                      ],
                    },
                  },
                  {
                    kind: 'Field',
                    name: {
                      kind: 'Name',
                      value: '__typename',
                    },
                    arguments: [],
                    directives: [],
                  },
                ],
              },
            },
            {
              kind: 'Field',
              name: {
                kind: 'Name',
                value: 'cursor',
              },
              arguments: [],
              directives: [],
              selectionSet: {
                kind: 'SelectionSet',
                selections: [
                  {
                    kind: 'Field',
                    name: {
                      kind: 'Name',
                      value: 'value',
                    },
                    arguments: [],
                    directives: [],
                  },
                  {
                    kind: 'Field',
                    name: {
                      kind: 'Name',
                      value: '__typename',
                    },
                    arguments: [],
                    directives: [],
                  },
                ],
              },
            },
            {
              kind: 'Field',
              name: {
                kind: 'Name',
                value: '__typename',
              },
              arguments: [],
              directives: [],
            },
          ],
        },
      },
      {
        kind: 'Field',
        name: {
          kind: 'Name',
          value: 'pageInfo',
        },
        arguments: [],
        directives: [],
        selectionSet: {
          kind: 'SelectionSet',
          selections: [
            {
              kind: 'Field',
              name: {
                kind: 'Name',
                value: 'endCursor',
              },
              arguments: [],
              directives: [],
              selectionSet: {
                kind: 'SelectionSet',
                selections: [
                  {
                    kind: 'Field',
                    name: {
                      kind: 'Name',
                      value: 'value',
                    },
                    arguments: [],
                    directives: [],
                  },
                  {
                    kind: 'Field',
                    name: {
                      kind: 'Name',
                      value: '__typename',
                    },
                    arguments: [],
                    directives: [],
                  },
                ],
              },
            },
            {
              kind: 'Field',
              name: {
                kind: 'Name',
                value: 'hasNextPage',
              },
              arguments: [],
              directives: [],
            },
            {
              kind: 'Field',
              name: {
                kind: 'Name',
                value: '__typename',
              },
              arguments: [],
              directives: [],
            },
          ],
        },
      },
      {
        kind: 'Field',
        name: {
          kind: 'Name',
          value: '__typename',
        },
        arguments: [],
        directives: [],
      },
    ],
  },
};

export const mockNetworkDnsFields: FieldNode = {
  kind: 'Field',
  name: {
    kind: 'Name',
    value: 'NetworkDns',
  },
  selectionSet: {
    kind: 'SelectionSet',
    selections: [
      {
        kind: 'Field',
        name: {
          kind: 'Name',
          value: 'totalCount',
        },
        arguments: [],
        directives: [],
      },
      {
        kind: 'Field',
        name: {
          kind: 'Name',
          value: 'edges',
        },
        arguments: [],
        directives: [],
        selectionSet: {
          kind: 'SelectionSet',
          selections: [
            {
              kind: 'Field',
              name: {
                kind: 'Name',
                value: 'node',
              },
              arguments: [],
              directives: [],
              selectionSet: {
                kind: 'SelectionSet',
                selections: [
                  {
                    kind: 'Field',
                    name: {
                      kind: 'Name',
                      value: '_id',
                    },
                    arguments: [],
                    directives: [],
                  },
                  {
                    kind: 'Field',
                    name: {
                      kind: 'Name',
                      value: 'dnsBytesIn',
                    },
                    arguments: [],
                    directives: [],
                  },
                  {
                    kind: 'Field',
                    name: {
                      kind: 'Name',
                      value: 'dnsBytesOut',
                    },
                    arguments: [],
                    directives: [],
                  },
                  {
                    kind: 'Field',
                    name: {
                      kind: 'Name',
                      value: 'dnsName',
                    },
                    arguments: [],
                    directives: [],
                  },
                  {
                    kind: 'Field',
                    name: {
                      kind: 'Name',
                      value: 'queryCount',
                    },
                    arguments: [],
                    directives: [],
                  },
                  {
                    kind: 'Field',
                    name: {
                      kind: 'Name',
                      value: 'uniqueDomains',
                    },
                    arguments: [],
                    directives: [],
                  },
                  {
                    kind: 'Field',
                    name: {
                      kind: 'Name',
                      value: '__typename',
                    },
                    arguments: [],
                    directives: [],
                  },
                ],
              },
            },
            {
              kind: 'Field',
              name: {
                kind: 'Name',
                value: 'cursor',
              },
              arguments: [],
              directives: [],
              selectionSet: {
                kind: 'SelectionSet',
                selections: [
                  {
                    kind: 'Field',
                    name: {
                      kind: 'Name',
                      value: 'value',
                    },
                    arguments: [],
                    directives: [],
                  },
                  {
                    kind: 'Field',
                    name: {
                      kind: 'Name',
                      value: '__typename',
                    },
                    arguments: [],
                    directives: [],
                  },
                ],
              },
            },
            {
              kind: 'Field',
              name: {
                kind: 'Name',
                value: '__typename',
              },
              arguments: [],
              directives: [],
            },
          ],
        },
      },
      {
        kind: 'Field',
        name: {
          kind: 'Name',
          value: 'pageInfo',
        },
        arguments: [],
        directives: [],
        selectionSet: {
          kind: 'SelectionSet',
          selections: [
            {
              kind: 'Field',
              name: {
                kind: 'Name',
                value: 'endCursor',
              },
              arguments: [],
              directives: [],
              selectionSet: {
                kind: 'SelectionSet',
                selections: [
                  {
                    kind: 'Field',
                    name: {
                      kind: 'Name',
                      value: 'value',
                    },
                    arguments: [],
                    directives: [],
                  },
                  {
                    kind: 'Field',
                    name: {
                      kind: 'Name',
                      value: '__typename',
                    },
                    arguments: [],
                    directives: [],
                  },
                ],
              },
            },
            {
              kind: 'Field',
              name: {
                kind: 'Name',
                value: 'hasNextPage',
              },
              arguments: [],
              directives: [],
            },
            {
              kind: 'Field',
              name: {
                kind: 'Name',
                value: '__typename',
              },
              arguments: [],
              directives: [],
            },
          ],
        },
      },
      {
        kind: 'Field',
        name: {
          kind: 'Name',
          value: '__typename',
        },
        arguments: [],
        directives: [],
      },
    ],
  },
};
