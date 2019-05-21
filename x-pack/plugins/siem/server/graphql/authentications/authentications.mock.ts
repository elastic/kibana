/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FieldNode } from 'graphql';

import { Logger } from '../../utils/logger';
import { SiemContext } from '../index';
import { AuthenticationsData } from '../types';

export const mockAuthenticationsData: { Authentications: AuthenticationsData } = {
  Authentications: {
    totalCount: 4,
    edges: [
      {
        node: {
          _id: 'cPsuhGcB0WOhS6qyTKC0',
          failures: 10,
          successes: 0,
          user: { name: ['Evan Hassanabad'] },
          lastSuccess: {
            timestamp: '2019-01-23T22:35:32.222Z',
            source: {
              ip: ['127.0.0.1'],
            },
            host: {
              id: ['host-id-1'],
              name: ['host-1'],
            },
          },
          lastFailure: {
            timestamp: '2019-01-23T22:35:32.222Z',
            source: {
              ip: ['8.8.8.8'],
            },
            host: {
              id: ['host-id-1'],
              name: ['host-2'],
            },
          },
        },
        cursor: {
          value: '98966fa2013c396155c460d35c0902be',
        },
      },
      {
        node: {
          _id: 'KwQDiWcB0WOhS6qyXmrW',
          failures: 10,
          successes: 0,
          user: { name: ['Braden Hassanabad'] },
          lastSuccess: {
            timestamp: '2019-01-23T22:35:32.222Z',
            source: {
              ip: ['127.0.0.1'],
            },
            host: {
              id: ['host-id-1'],
              name: ['host-1'],
            },
          },
          lastFailure: {
            timestamp: '2019-01-23T22:35:32.222Z',
            source: {
              ip: ['8.8.8.8'],
            },
            host: {
              id: ['host-id-1'],
              name: ['host-2'],
            },
          },
        },
        cursor: {
          value: 'aa7ca589f1b8220002f2fc61c64cfbf1',
        },
      },
    ],
    pageInfo: {
      endCursor: {
        value: 'aa7ca589f1b8220002f2fc61c64cfbf1',
      },
      hasNextPage: true,
    },
  },
};

export const getAuthenticationsQueryMock = (logger: Logger) => ({
  source: (root: unknown, args: unknown, context: SiemContext) => {
    logger.info('Mock source');
    const operationName = context.req.payload.operationName.toLowerCase();
    switch (operationName) {
      case 'test': {
        logger.info(`Using mock for test ${mockAuthenticationsData}`);
        return mockAuthenticationsData;
      }
      default: {
        return {};
      }
    }
  },
});

export const mockAuthenticationsFields: FieldNode = {
  kind: 'Field',
  name: {
    kind: 'Name',
    value: 'Authentications',
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
                value: 'authentication',
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
                      value: 'failures',
                    },
                    arguments: [],
                    directives: [],
                  },
                  {
                    kind: 'Field',
                    name: {
                      kind: 'Name',
                      value: 'successes',
                    },
                    arguments: [],
                    directives: [],
                  },
                  {
                    kind: 'Field',
                    name: {
                      kind: 'Name',
                      value: 'user',
                    },
                    arguments: [],
                    directives: [],
                  },
                  {
                    kind: 'Field',
                    name: {
                      kind: 'Name',
                      value: 'from',
                    },
                    arguments: [],
                    directives: [],
                  },
                  {
                    kind: 'Field',
                    name: {
                      kind: 'Name',
                      value: 'to',
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
                            value: 'id',
                          },
                          arguments: [],
                          directives: [],
                        },
                        {
                          kind: 'Field',
                          name: {
                            kind: 'Name',
                            value: 'name',
                          },
                          arguments: [],
                          directives: [],
                        },
                        {
                          kind: 'Field',
                          name: {
                            kind: 'Name',
                            value: 'ip',
                          },
                          arguments: [],
                          directives: [],
                        },
                      ],
                    },
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
                ],
              },
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
          ],
        },
      },
    ],
  },
};
