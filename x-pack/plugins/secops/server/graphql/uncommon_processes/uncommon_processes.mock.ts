/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FieldNode } from 'graphql';
import { Logger } from '../../utils/logger';
import { Context } from '../index';

/* tslint:disable */
export const mockUncommonProcessesData = {
  UncommonProcesses: {
    totalCount: 4,
    edges: [
      {
        uncommonProcess: {
          _id: '3PsyhGcB0WOhS6qy2LAB',
          hosts: ['Hello World', 'Hello World'],
          instances: 93,
          name: 'galadriel.elstc.co',
          title: 'Hello World',
        },
        cursor: {
          value: '6f7be6fb33e6c77f057266415c094408',
        },
      },
      {
        uncommonProcess: {
          _id: 'cPsuhGcB0WOhS6qyTKC0',
          hosts: ['Hello World', 'Hello World'],
          instances: 97,
          name: 'elrond.elstc.co',
          title: 'Hello World',
        },
        cursor: {
          value: '98966fa2013c396155c460d35c0902be',
        },
      },
    ],
    pageInfo: {
      endCursor: {
        value: '98966fa2013c396155c460d35c0902be',
      },
      hasNextPage: true,
    },
  },
};
/* tslint:enable */

export const getUncommonProcessesQueryMock = (logger: Logger) => ({
  source: (root: unknown, args: unknown, context: Context) => {
    logger.info('Mock source');
    const operationName = context.req.payload.operationName.toLowerCase();
    switch (operationName) {
      case 'test': {
        logger.info(`Using mock for test ${mockUncommonProcessesData}`);
        return mockUncommonProcessesData;
      }
      default: {
        return {};
      }
    }
  },
});

export const mockUncommonProcessesFields: FieldNode = {
  kind: 'Field',
  name: {
    kind: 'Name',
    value: 'UncommonProcess',
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
                value: 'uncommonProcesses',
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
                      value: 'instances',
                    },
                    arguments: [],
                    directives: [],
                  },
                  {
                    kind: 'Field',
                    name: {
                      kind: 'Name',
                      value: 'title',
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
