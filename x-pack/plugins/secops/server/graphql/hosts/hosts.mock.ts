/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FieldNode } from 'graphql';
import { Logger } from '../../utils/logger';
import { Context } from '../index';

/* tslint:disable */
export const mockHostsData = {
  Hosts: {
    totalCount: 4,
    edges: [
        {
        host: {
            _id: '3PsyhGcB0WOhS6qy2LAB',
            name: 'galadriel.elstc.co',
            os: 'Ubuntu',
            version: '18.04.1 LTS (Bionic Beaver)',
            firstSeen: '2018-12-06T15:45:52.095Z'
        },
        cursor: {
            value: '6f7be6fb33e6c77f057266415c094408'
        }
        },
        {
        host: {
            _id: 'cPsuhGcB0WOhS6qyTKC0',
            name: 'elrond.elstc.co',
            os: 'Ubuntu',
            version: '18.04.1 LTS (Bionic Beaver)',
            firstSeen: '2018-12-06T15:40:53.319Z'
        },
        cursor: {
            value: '98966fa2013c396155c460d35c0902be'
        }
        }
    ],
    pageInfo: {
        endCursor: {
        value: '98966fa2013c396155c460d35c0902be'
        },
        hasNextPage: true
    }
  }
};
/* tslint:enable */

export const getHostsQueryMock = (logger: Logger) => ({
  source: (root: unknown, args: unknown, context: Context) => {
    logger.info('Mock source');
    const operationName = context.req.payload.operationName.toLowerCase();
    switch (operationName) {
      case 'test': {
        logger.info(`Using mock for test ${mockHostsData}`);
        return mockHostsData;
      }
      default: {
        return {};
      }
    }
  },
});

export const mockHostsFields: FieldNode = {
  kind: 'Field',
  name: {
    kind: 'Name',
    value: 'Hosts',
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
                value: 'host',
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
                      value: 'name',
                    },
                    arguments: [],
                    directives: [],
                  },
                  {
                    kind: 'Field',
                    name: {
                      kind: 'Name',
                      value: 'os',
                    },
                    arguments: [],
                    directives: [],
                  },
                  {
                    kind: 'Field',
                    name: {
                      kind: 'Name',
                      value: 'version',
                    },
                    arguments: [],
                    directives: [],
                  },
                  {
                    kind: 'Field',
                    name: {
                      kind: 'Name',
                      value: 'firstSeen',
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
