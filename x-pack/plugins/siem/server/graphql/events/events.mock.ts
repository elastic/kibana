/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FieldNode } from 'graphql';

import { Logger } from '../../utils/logger';
import { SiemContext } from '../index';
import { EventsData, LastEventTimeData, TimelineData, TimelineDetailsData } from '../types';

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
            ip: ['24.168.54.169'],
            port: [62123],
          },
          event: {
            category: null,
            id: null,
            module: ['system'],
            severity: null,
            type: null,
          },
          geo: null,
          host: {
            name: ['siem-general'],
            ip: null,
          },
          source: {
            ip: ['10.142.0.6'],
            port: [9200],
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
            ip: ['24.168.54.169'],
            port: [62145],
          },
          event: {
            category: null,
            id: null,
            module: ['system'],
            severity: null,
            type: null,
          },
          geo: null,
          host: {
            name: ['siem-general'],
            ip: null,
          },
          source: {
            ip: ['10.142.0.6'],
            port: [9200],
          },
          suricata: null,
        },
      },
    ],
  },
};

export const mockTimelineData: { Timeline: TimelineData } = {
  Timeline: {
    totalCount: 15546,
    pageInfo: { hasNextPage: true, endCursor: { value: '1546878704036', tiebreaker: '10624' } },
    edges: [
      {
        cursor: { value: '1546878704036', tiebreaker: '10656' },
        node: {
          _id: 'Fo8nKWgBiyhPd5Zo3cib',
          _index: 'auditbeat-7.0.0-2019.01.07',
          data: [
            { field: '@timestamp', value: ['2019-01-07T16:31:44.036Z'] },
            { field: 'host.name', value: ['siem-general'] },
          ],
          ecs: {
            _id: 'Fo8nKWgBiyhPd5Zo3cib',
            timestamp: '2019-01-07T16:31:44.036Z',
            _index: 'auditbeat-7.0.0-2019.01.07',
            destination: { ip: ['24.168.54.169'], port: [62123] },
            event: { category: null, id: null, module: ['system'], severity: null, type: null },
            geo: null,
            host: { name: ['siem-general'], ip: null },
            source: { ip: ['10.142.0.6'], port: [9200] },
            suricata: null,
          },
        },
      },
      {
        cursor: { value: '1546878704036', tiebreaker: '10624' },
        node: {
          _id: 'F48nKWgBiyhPd5Zo3cib',
          _index: 'auditbeat-7.0.0-2019.01.07',
          data: [
            { field: '@timestamp', value: ['2019-01-07T16:31:44.036Z'] },
            { field: 'host.name', value: ['siem-general'] },
          ],
          ecs: {
            _id: 'F48nKWgBiyhPd5Zo3cib',
            timestamp: '2019-01-07T16:31:44.036Z',
            _index: 'auditbeat-7.0.0-2019.01.07',
            destination: { ip: ['24.168.54.169'], port: [62145] },
            event: { category: null, id: null, module: ['system'], severity: null, type: null },
            geo: null,
            host: { name: ['siem-general'], ip: null },
            source: { ip: ['10.142.0.6'], port: [9200] },
            suricata: null,
          },
        },
      },
    ],
  },
};

export const mockTimelineDetailsData: { TimelineDetails: TimelineDetailsData } = {
  TimelineDetails: {
    data: [
      {
        category: '_id',
        description: 'Each document has an _id that uniquely identifies it',
        example: 'Y-6TfmcB0WOhS6qyMv3s',
        field: '_id',
        type: 'keyword',
        originalValue: 'QRhG1WgBqd-n62SwZYDT',
        values: ['QRhG1WgBqd-n62SwZYDT'],
      },
      {
        category: '_index',
        description:
          'An index is like a ‘database’ in a relational database. It has a mapping which defines multiple types. An index is a logical namespace which maps to one or more primary shards and can have zero or more replica shards.',
        example: 'auditbeat-8.0.0-2019.02.19-000001',
        field: '_index',
        type: 'keyword',
        originalValue: 'filebeat-7.0.0-iot-2019.06',
        values: ['filebeat-7.0.0-iot-2019.06'],
      },
      {
        category: '_type',
        description: null,
        example: null,
        field: '_type',
        type: 'keyword',
        originalValue: '_doc',
        values: ['_doc'],
      },
      {
        category: '_score',
        description: null,
        example: null,
        field: '_score',
        type: 'long',
        originalValue: 1,
        values: ['1'],
      },
      {
        category: '@timestamp',
        description:
          'Date/time when the event originated. For log events this is the date/time when the event was generated, and not when it was read. Required field for all events.',
        example: '2016-05-23T08:05:34.853Z',
        field: '@timestamp',
        type: 'date',
        originalValue: '2019-02-10T02:39:44.107Z',
        values: ['2019-02-10T02:39:44.107Z'],
      },
      {
        category: '@version',
        description: null,
        example: null,
        field: '@version',
        type: 'keyword',
        originalValue: '1',
        values: ['1'],
      },
      {
        category: 'agent',
        description:
          'Ephemeral identifier of this agent (if one exists). This id normally changes across restarts, but `agent.id` does not.',
        example: '8a4f500f',
        field: 'agent.ephemeral_id',
        type: 'keyword',
        originalValue: '909cd6a1-527d-41a5-9585-a7fb5386f851',
        values: ['909cd6a1-527d-41a5-9585-a7fb5386f851'],
      },
      {
        category: 'agent',
        description: null,
        example: null,
        field: 'agent.hostname',
        type: 'keyword',
        originalValue: 'raspberrypi',
        values: ['raspberrypi'],
      },
      {
        category: 'agent',
        description:
          'Unique identifier of this agent (if one exists). Example: For Beats this would be beat.id.',
        example: '8a4f500d',
        field: 'agent.id',
        type: 'keyword',
        originalValue: '4d3ea604-27e5-4ec7-ab64-44f82285d776',
        values: ['4d3ea604-27e5-4ec7-ab64-44f82285d776'],
      },
      {
        category: 'agent',
        description:
          'Type of the agent. The agent type stays always the same and should be given by the agent used. In case of Filebeat the agent would always be Filebeat also if two Filebeat instances are run on the same machine.',
        example: 'filebeat',
        field: 'agent.type',
        type: 'keyword',
        originalValue: 'filebeat',
        values: ['filebeat'],
      },
      {
        category: 'agent',
        description: 'Version of the agent.',
        example: '6.0.0-rc2',
        field: 'agent.version',
        type: 'keyword',
        originalValue: '7.0.0',
        values: ['7.0.0'],
      },
      {
        category: 'destination',
        description: 'Destination domain.',
        example: null,
        field: 'destination.domain',
        type: 'keyword',
        originalValue: 's3-iad-2.cf.dash.row.aiv-cdn.net',
        values: ['s3-iad-2.cf.dash.row.aiv-cdn.net'],
      },
      {
        category: 'destination',
        description:
          'IP address of the destination. Can be one or multiple IPv4 or IPv6 addresses.',
        example: null,
        field: 'destination.ip',
        type: 'ip',
        originalValue: '10.100.7.196',
        values: ['10.100.7.196'],
      },
    ],
  },
};

export const mockLastEventTimeData: { LastEventTime: LastEventTimeData } = {
  LastEventTime: {
    lastSeen: '2019-01-07T16:31:44.036Z',
  },
};

export const getEventsQueryMock = (logger: Logger) => ({
  source: (root: unknown, args: unknown, context: SiemContext) => {
    logger.info('Mock source');
    const operationName = context.req.payload.operationName.toLowerCase();
    switch (operationName) {
      case 'events': {
        return mockEventsData;
      }
      case 'timeline': {
        return mockTimelineData;
      }
      case 'details': {
        return mockTimelineDetailsData;
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

export const mockTimelineFields: FieldNode = {
  kind: 'Field',
  name: { kind: 'Name', value: 'Timeline' },
  arguments: [
    {
      kind: 'Argument',
      name: { kind: 'Name', value: 'timerange' },
      value: { kind: 'Variable', name: { kind: 'Name', value: 'timerange' } },
    },
    {
      kind: 'Argument',
      name: { kind: 'Name', value: 'pagination' },
      value: { kind: 'Variable', name: { kind: 'Name', value: 'pagination' } },
    },
    {
      kind: 'Argument',
      name: { kind: 'Name', value: 'sortField' },
      value: { kind: 'Variable', name: { kind: 'Name', value: 'sortField' } },
    },
    {
      kind: 'Argument',
      name: { kind: 'Name', value: 'filterQuery' },
      value: { kind: 'Variable', name: { kind: 'Name', value: 'filterQuery' } },
    },
    {
      kind: 'Argument',
      name: { kind: 'Name', value: 'fieldRequested' },
      value: { kind: 'Variable', name: { kind: 'Name', value: 'fieldRequested' } },
    },
  ],
  selectionSet: {
    kind: 'SelectionSet',
    selections: [
      { kind: 'Field', name: { kind: 'Name', value: 'totalCount' }, arguments: [], directives: [] },
      {
        kind: 'Field',
        name: { kind: 'Name', value: 'pageInfo' },
        arguments: [],
        directives: [],
        selectionSet: {
          kind: 'SelectionSet',
          selections: [
            {
              kind: 'Field',
              name: { kind: 'Name', value: 'endCursor' },
              arguments: [],
              directives: [],
              selectionSet: {
                kind: 'SelectionSet',
                selections: [
                  {
                    kind: 'Field',
                    name: { kind: 'Name', value: 'value' },
                    arguments: [],
                    directives: [],
                  },
                  {
                    kind: 'Field',
                    name: { kind: 'Name', value: 'tiebreaker' },
                    arguments: [],
                    directives: [],
                  },
                ],
              },
            },
            {
              kind: 'Field',
              name: { kind: 'Name', value: 'hasNextPage' },
              arguments: [],
              directives: [],
            },
          ],
        },
      },
      {
        kind: 'Field',
        name: { kind: 'Name', value: 'edges' },
        arguments: [],
        directives: [],
        selectionSet: {
          kind: 'SelectionSet',
          selections: [
            {
              kind: 'Field',
              name: { kind: 'Name', value: 'node' },
              arguments: [],
              directives: [],
              selectionSet: {
                kind: 'SelectionSet',
                selections: [
                  {
                    kind: 'Field',
                    name: { kind: 'Name', value: '_id' },
                    arguments: [],
                    directives: [],
                  },
                  {
                    kind: 'Field',
                    name: { kind: 'Name', value: '_index' },
                    arguments: [],
                    directives: [],
                  },
                  {
                    kind: 'Field',
                    name: { kind: 'Name', value: 'timestamp' },
                    arguments: [],
                    directives: [],
                  },
                  {
                    kind: 'Field',
                    name: { kind: 'Name', value: 'event' },
                    arguments: [],
                    directives: [],
                    selectionSet: {
                      kind: 'SelectionSet',
                      selections: [
                        {
                          kind: 'Field',
                          name: { kind: 'Name', value: 'type' },
                          arguments: [],
                          directives: [],
                        },
                        {
                          kind: 'Field',
                          name: { kind: 'Name', value: 'severity' },
                          arguments: [],
                          directives: [],
                        },
                        {
                          kind: 'Field',
                          name: { kind: 'Name', value: 'module' },
                          arguments: [],
                          directives: [],
                        },
                        {
                          kind: 'Field',
                          name: { kind: 'Name', value: 'category' },
                          arguments: [],
                          directives: [],
                        },
                        {
                          kind: 'Field',
                          name: { kind: 'Name', value: 'id' },
                          arguments: [],
                          directives: [],
                        },
                      ],
                    },
                  },
                  {
                    kind: 'Field',
                    name: { kind: 'Name', value: 'host' },
                    arguments: [],
                    directives: [],
                    selectionSet: {
                      kind: 'SelectionSet',
                      selections: [
                        {
                          kind: 'Field',
                          name: { kind: 'Name', value: 'name' },
                          arguments: [],
                          directives: [],
                        },
                        {
                          kind: 'Field',
                          name: { kind: 'Name', value: 'ip' },
                          arguments: [],
                          directives: [],
                        },
                      ],
                    },
                  },
                  {
                    kind: 'Field',
                    name: { kind: 'Name', value: 'source' },
                    arguments: [],
                    directives: [],
                    selectionSet: {
                      kind: 'SelectionSet',
                      selections: [
                        {
                          kind: 'Field',
                          name: { kind: 'Name', value: 'ip' },
                          arguments: [],
                          directives: [],
                        },
                        {
                          kind: 'Field',
                          name: { kind: 'Name', value: 'port' },
                          arguments: [],
                          directives: [],
                        },
                      ],
                    },
                  },
                  {
                    kind: 'Field',
                    name: { kind: 'Name', value: 'destination' },
                    arguments: [],
                    directives: [],
                    selectionSet: {
                      kind: 'SelectionSet',
                      selections: [
                        {
                          kind: 'Field',
                          name: { kind: 'Name', value: 'ip' },
                          arguments: [],
                          directives: [],
                        },
                        {
                          kind: 'Field',
                          name: { kind: 'Name', value: 'port' },
                          arguments: [],
                          directives: [],
                        },
                      ],
                    },
                  },
                  {
                    kind: 'Field',
                    name: { kind: 'Name', value: 'geo' },
                    arguments: [],
                    directives: [],
                    selectionSet: {
                      kind: 'SelectionSet',
                      selections: [
                        {
                          kind: 'Field',
                          name: { kind: 'Name', value: 'region_name' },
                          arguments: [],
                          directives: [],
                        },
                        {
                          kind: 'Field',
                          name: { kind: 'Name', value: 'country_iso_code' },
                          arguments: [],
                          directives: [],
                        },
                      ],
                    },
                  },
                  {
                    kind: 'Field',
                    name: { kind: 'Name', value: 'suricata' },
                    arguments: [],
                    directives: [],
                    selectionSet: {
                      kind: 'SelectionSet',
                      selections: [
                        {
                          kind: 'Field',
                          name: { kind: 'Name', value: 'eve' },
                          arguments: [],
                          directives: [],
                          selectionSet: {
                            kind: 'SelectionSet',
                            selections: [
                              {
                                kind: 'Field',
                                name: { kind: 'Name', value: 'proto' },
                                arguments: [],
                                directives: [],
                              },
                              {
                                kind: 'Field',
                                name: { kind: 'Name', value: 'flow_id' },
                                arguments: [],
                                directives: [],
                              },
                              {
                                kind: 'Field',
                                name: { kind: 'Name', value: 'alert' },
                                arguments: [],
                                directives: [],
                                selectionSet: {
                                  kind: 'SelectionSet',
                                  selections: [
                                    {
                                      kind: 'Field',
                                      name: { kind: 'Name', value: 'signature' },
                                      arguments: [],
                                      directives: [],
                                    },
                                    {
                                      kind: 'Field',
                                      name: { kind: 'Name', value: 'signature_id' },
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
            {
              kind: 'Field',
              name: { kind: 'Name', value: 'cursor' },
              arguments: [],
              directives: [],
              selectionSet: {
                kind: 'SelectionSet',
                selections: [
                  {
                    kind: 'Field',
                    name: { kind: 'Name', value: 'value' },
                    arguments: [],
                    directives: [],
                  },
                  {
                    kind: 'Field',
                    name: { kind: 'Name', value: '__typename' },
                    arguments: [],
                    directives: [],
                  },
                ],
              },
            },
            {
              kind: 'Field',
              name: { kind: 'Name', value: '__typename' },
              arguments: [],
              directives: [],
            },
          ],
        },
      },
    ],
  },
};
