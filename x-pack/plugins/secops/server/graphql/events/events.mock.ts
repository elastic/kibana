/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FieldNode } from 'graphql';

import { Logger } from '../../utils/logger';
import { SecOpsContext } from '../index';
import { EventsData } from '../types';

export const mockEventsData: { Events: EventsData } = {
  Events: {
    totalCount: 15546,
    pageInfo: {
      hasNextPage: true,
      endCursor: {
        value: '1546878704036',
        tiebreaker: '10624',
      },
    },
    kpiEventType: [{ count: 28, value: 'Young' }, { count: 82, value: 'Old' }],
    edges: [
      {
        cursor: {
          value: '1546878704036',
          tiebreaker: '10656',
        },
        node: {
          _id: 'Fo8nKWgBiyhPd5Zo3cib',
          timestamp: '2019-01-07T16:31:44.036Z',
          _index: 'auditbeat-7.0.0-2019.01.07',
          destination: {
            ip: '24.168.54.169',
            port: 62123,
          },
          event: {
            category: null,
            id: null,
            module: 'system',
            severity: null,
            type: null,
          },
          geo: null,
          host: {
            name: 'siem-general',
            ip: null,
          },
          source: {
            ip: '10.142.0.6',
            port: 9200,
          },
          suricata: null,
        },
      },
      {
        cursor: {
          value: '1546878704036',
          tiebreaker: '10624',
        },
        node: {
          _id: 'F48nKWgBiyhPd5Zo3cib',
          timestamp: '2019-01-07T16:31:44.036Z',
          _index: 'auditbeat-7.0.0-2019.01.07',
          destination: {
            ip: '24.168.54.169',
            port: 62145,
          },
          event: {
            category: null,
            id: null,
            module: 'system',
            severity: null,
            type: null,
          },
          geo: null,
          host: {
            name: 'siem-general',
            ip: null,
          },
          source: {
            ip: '10.142.0.6',
            port: 9200,
          },
          suricata: null,
        },
      },
    ],
  },
};

export const getEventsQueryMock = (logger: Logger) => ({
  source: (root: unknown, args: unknown, context: SecOpsContext) => {
    logger.info('Mock source');
    const operationName = context.req.payload.operationName.toLowerCase();
    switch (operationName) {
      case 'test': {
        logger.info(`Using mock for test ${mockEventsData}`);
        return mockEventsData;
      }
      default: {
        return {};
      }
    }
  },
});

export const mockEventsFields: FieldNode = {
  kind: 'Field',
  name: {
    kind: 'Name',
    value: 'Events',
  },
  arguments: [
    {
      kind: 'Argument',
      name: {
        kind: 'Name',
        value: 'timerange',
      },
      value: {
        kind: 'Variable',
        name: {
          kind: 'Name',
          value: 'timerange',
        },
      },
    },
    {
      kind: 'Argument',
      name: {
        kind: 'Name',
        value: 'pagination',
      },
      value: {
        kind: 'Variable',
        name: {
          kind: 'Name',
          value: 'pagination',
        },
      },
    },
    {
      kind: 'Argument',
      name: {
        kind: 'Name',
        value: 'sortField',
      },
      value: {
        kind: 'Variable',
        name: {
          kind: 'Name',
          value: 'sortField',
        },
      },
    },
    {
      kind: 'Argument',
      name: {
        kind: 'Name',
        value: 'filterQuery',
      },
      value: {
        kind: 'Variable',
        name: {
          kind: 'Name',
          value: 'filterQuery',
        },
      },
    },
  ],
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
                      value: 'tiebreaker',
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
                value: 'event',
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
                      value: '_index',
                    },
                    arguments: [],
                    directives: [],
                  },
                  {
                    kind: 'Field',
                    name: {
                      kind: 'Name',
                      value: 'timestamp',
                    },
                    arguments: [],
                    directives: [],
                  },
                  {
                    kind: 'Field',
                    name: {
                      kind: 'Name',
                      value: 'event',
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
                            value: 'type',
                          },
                          arguments: [],
                          directives: [],
                        },
                        {
                          kind: 'Field',
                          name: {
                            kind: 'Name',
                            value: 'severity',
                          },
                          arguments: [],
                          directives: [],
                        },
                        {
                          kind: 'Field',
                          name: {
                            kind: 'Name',
                            value: 'module',
                          },
                          arguments: [],
                          directives: [],
                        },
                        {
                          kind: 'Field',
                          name: {
                            kind: 'Name',
                            value: 'category',
                          },
                          arguments: [],
                          directives: [],
                        },
                        {
                          kind: 'Field',
                          name: {
                            kind: 'Name',
                            value: 'id',
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
                            value: 'port',
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
                            value: 'port',
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
                      value: 'geo',
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
                            value: 'region_name',
                          },
                          arguments: [],
                          directives: [],
                        },
                        {
                          kind: 'Field',
                          name: {
                            kind: 'Name',
                            value: 'country_iso_code',
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
                      value: 'suricata',
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
                            value: 'eve',
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
                                  value: 'proto',
                                },
                                arguments: [],
                                directives: [],
                              },
                              {
                                kind: 'Field',
                                name: {
                                  kind: 'Name',
                                  value: 'flow_id',
                                },
                                arguments: [],
                                directives: [],
                              },
                              {
                                kind: 'Field',
                                name: {
                                  kind: 'Name',
                                  value: 'alert',
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
                                        value: 'signature',
                                      },
                                      arguments: [],
                                      directives: [],
                                    },
                                    {
                                      kind: 'Field',
                                      name: {
                                        kind: 'Name',
                                        value: 'signature_id',
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
                      ],
                    },
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
          value: 'kpiEventType',
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
                value: 'count',
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
