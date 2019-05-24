/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EcsEdges, TimelineDetailsData } from '../../graphql/types';
import { eventFieldsMap } from '../ecs_fields';
import { FrameworkAdapter, FrameworkRequest } from '../framework';

import {
  ElasticsearchEventsAdapter,
  formatEventsData,
  formatTimelineData,
} from './elasticsearch_adapter';
import {
  mockOptions,
  mockRequest,
  mockResponseMap,
  mockResponseSearchTimelineDetails,
  mockTimelineDetailsResult,
} from './mock';
import { EventHit } from './types';

describe('events elasticsearch_adapter', () => {
  const hit: EventHit = {
    _index: 'index-123',
    _type: 'type-123',
    _id: 'id-123',
    _score: 10,
    aggregations: {},
    _source: {
      '@timestamp': ['time-1'],
      host: {
        name: ['hostname-1'],
        ip: ['hostip-1'],
      },
      suricata: {
        eve: {
          alert: {
            category: 'suricata-category-1',
            signature: ['suricata-signature-1'],
            signature_id: [5000],
            severity: 1,
          },
          flow_id: [100],
          proto: ['suricata-proto-1'],
        },
      },
      source: {
        ip: ['source-ip-1'],
        port: [100],
      },
      destination: {
        ip: ['destination-ip-1'],
        port: [200],
        geo: {
          region_name: ['geo-region-1'],
          country_iso_code: ['geo-iso-code-1'],
        },
      },
      event: {
        action: ['event-action-1'],
        module: ['event-module-1'],
        type: ['event-type-1'],
        category: ['event-category-1'],
        severity: [1],
        id: ['event-id-1'],
      },
    },
    sort: ['123567890', '1234'],
  };

  describe('#formatEventsData', () => {
    test('it formats an event with a source of hostname correctly', () => {
      const fields: ReadonlyArray<string> = ['host.name'];
      const data = formatEventsData(fields, hit, eventFieldsMap);
      const expected: EcsEdges = {
        cursor: {
          tiebreaker: '1234',
          value: '123567890',
        },
        node: {
          _id: 'id-123',
          _index: 'index-123',
          host: {
            name: ['hostname-1'],
          },
        },
      };
      expect(data).toEqual(expected);
    });

    test('it formats an event with a source of host ip correctly', () => {
      const fields: ReadonlyArray<string> = ['host.ip'];
      const data = formatEventsData(fields, hit, eventFieldsMap);
      const expected: EcsEdges = {
        cursor: {
          tiebreaker: '1234',
          value: '123567890',
        },
        node: {
          _id: 'id-123',
          _index: 'index-123',
          host: {
            ip: ['hostip-1'],
          },
        },
      };
      expect(data).toEqual(expected);
    });

    test('it formats an event with a event category correctly', () => {
      const fields: ReadonlyArray<string> = ['event.category'];
      const data = formatEventsData(fields, hit, eventFieldsMap);
      const expected: EcsEdges = {
        cursor: {
          tiebreaker: '1234',
          value: '123567890',
        },
        node: {
          _id: 'id-123',
          _index: 'index-123',
          event: {
            category: ['event-category-1'],
          },
        },
      };

      expect(data).toEqual(expected);
    });

    test('it formats an event with a event id correctly', () => {
      const fields: ReadonlyArray<string> = ['event.id'];
      const data = formatEventsData(fields, hit, eventFieldsMap);
      const expected: EcsEdges = {
        cursor: {
          tiebreaker: '1234',
          value: '123567890',
        },
        node: {
          _id: 'id-123',
          _index: 'index-123',
          event: {
            id: ['event-id-1'],
          },
        },
      };
      expect(data).toEqual(expected);
    });

    test('it formats an event with a event module correctly', () => {
      const fields: ReadonlyArray<string> = ['event.module'];
      const data = formatEventsData(fields, hit, eventFieldsMap);
      const expected: EcsEdges = {
        cursor: {
          tiebreaker: '1234',
          value: '123567890',
        },
        node: {
          _id: 'id-123',
          _index: 'index-123',
          event: {
            module: ['event-module-1'],
          },
        },
      };
      expect(data).toEqual(expected);
    });

    test('it formats an event with a event action correctly', () => {
      const fields: ReadonlyArray<string> = ['event.action'];
      const data = formatEventsData(fields, hit, eventFieldsMap);
      const expected: EcsEdges = {
        cursor: {
          tiebreaker: '1234',
          value: '123567890',
        },
        node: {
          _id: 'id-123',
          _index: 'index-123',
          event: {
            action: ['event-action-1'],
          },
        },
      };

      expect(data).toEqual(expected);
    });

    test('it formats an event with a event severity correctly', () => {
      const fields: ReadonlyArray<string> = ['event.severity'];
      const data = formatEventsData(fields, hit, eventFieldsMap);
      const expected: EcsEdges = {
        cursor: {
          tiebreaker: '1234',
          value: '123567890',
        },
        node: {
          _id: 'id-123',
          _index: 'index-123',
          event: {
            severity: [1],
          },
        },
      };

      expect(data).toEqual(expected);
    });

    test('it formats an event with a suricata eve flow id correctly', () => {
      const fields: ReadonlyArray<string> = ['suricata.eve.flow_id'];
      const data = formatEventsData(fields, hit, eventFieldsMap);
      const expected: EcsEdges = {
        cursor: {
          tiebreaker: '1234',
          value: '123567890',
        },
        node: {
          _id: 'id-123',
          _index: 'index-123',
          suricata: {
            eve: {
              flow_id: [100],
            },
          },
        },
      };

      expect(data).toEqual(expected);
    });

    test('it formats an event with a suricata eve proto correctly', () => {
      const fields: ReadonlyArray<string> = ['suricata.eve.proto'];
      const data = formatEventsData(fields, hit, eventFieldsMap);
      const expected: EcsEdges = {
        cursor: {
          tiebreaker: '1234',
          value: '123567890',
        },
        node: {
          _id: 'id-123',
          _index: 'index-123',
          suricata: {
            eve: {
              proto: ['suricata-proto-1'],
            },
          },
        },
      };

      expect(data).toEqual(expected);
    });

    test('it formats an event with a suricata eve alert signature correctly', () => {
      const fields: ReadonlyArray<string> = ['suricata.eve.alert.signature'];
      const data = formatEventsData(fields, hit, eventFieldsMap);
      const expected: EcsEdges = {
        cursor: {
          tiebreaker: '1234',
          value: '123567890',
        },
        node: {
          _id: 'id-123',
          _index: 'index-123',
          suricata: {
            eve: {
              alert: {
                signature: ['suricata-signature-1'],
              },
            },
          },
        },
      };

      expect(data).toEqual(expected);
    });

    test('it formats an event with a suricata eve alert signature id correctly', () => {
      const fields: ReadonlyArray<string> = ['suricata.eve.alert.signature_id'];
      const data = formatEventsData(fields, hit, eventFieldsMap);
      const expected: EcsEdges = {
        cursor: {
          tiebreaker: '1234',
          value: '123567890',
        },
        node: {
          _id: 'id-123',
          _index: 'index-123',
          suricata: {
            eve: {
              alert: {
                signature_id: [5000],
              },
            },
          },
        },
      };

      expect(data).toEqual(expected);
    });

    test('it formats an event with a source ip correctly', () => {
      const fields: ReadonlyArray<string> = ['source.ip'];
      const data = formatEventsData(fields, hit, eventFieldsMap);
      const expected: EcsEdges = {
        cursor: {
          tiebreaker: '1234',
          value: '123567890',
        },
        node: {
          _id: 'id-123',
          _index: 'index-123',
          source: {
            ip: ['source-ip-1'],
          },
        },
      };

      expect(data).toEqual(expected);
    });

    test('it formats an event with a source port correctly', () => {
      const fields: ReadonlyArray<string> = ['source.port'];
      const data = formatEventsData(fields, hit, eventFieldsMap);
      const expected: EcsEdges = {
        cursor: {
          tiebreaker: '1234',
          value: '123567890',
        },
        node: {
          _id: 'id-123',
          _index: 'index-123',
          source: {
            port: [100],
          },
        },
      };

      expect(data).toEqual(expected);
    });

    test('it formats an event with a destination ip correctly', () => {
      const fields: ReadonlyArray<string> = ['destination.ip'];
      const data = formatEventsData(fields, hit, eventFieldsMap);
      const expected: EcsEdges = {
        cursor: {
          tiebreaker: '1234',
          value: '123567890',
        },
        node: {
          _id: 'id-123',
          _index: 'index-123',
          destination: {
            ip: ['destination-ip-1'],
          },
        },
      };

      expect(data).toEqual(expected);
    });

    test('it formats an event with a destination port correctly', () => {
      const fields: ReadonlyArray<string> = ['destination.port'];
      const data = formatEventsData(fields, hit, eventFieldsMap);
      const expected: EcsEdges = {
        cursor: {
          tiebreaker: '1234',
          value: '123567890',
        },
        node: {
          _id: 'id-123',
          _index: 'index-123',
          destination: {
            port: [200],
          },
        },
      };

      expect(data).toEqual(expected);
    });

    test('it formats an event with a geo region name correctly', () => {
      const fields: ReadonlyArray<string> = ['geo.region_name'];
      const data = formatEventsData(fields, hit, eventFieldsMap);
      const expected: EcsEdges = {
        cursor: {
          tiebreaker: '1234',
          value: '123567890',
        },
        node: {
          _id: 'id-123',
          _index: 'index-123',
          geo: {
            region_name: ['geo-region-1'],
          },
        },
      };

      expect(data).toEqual(expected);
    });

    test('it formats an event with a geo country iso code correctly', () => {
      const fields: ReadonlyArray<string> = ['geo.country_iso_code'];
      const data = formatEventsData(fields, hit, eventFieldsMap);
      const expected: EcsEdges = {
        cursor: {
          tiebreaker: '1234',
          value: '123567890',
        },
        node: {
          _id: 'id-123',
          _index: 'index-123',
          geo: {
            country_iso_code: ['geo-iso-code-1'],
          },
        },
      };

      expect(data).toEqual(expected);
    });

    test('it formats an event with a lot of fields correctly', () => {
      const fields: ReadonlyArray<string> = [
        'host.name',
        'host.ip',
        'suricata.eve.proto',
        'suricata.eve.alert.signature_id',
        'geo.region_name',
      ];
      const data = formatEventsData(fields, hit, eventFieldsMap);
      const expected: EcsEdges = {
        cursor: {
          tiebreaker: '1234',
          value: '123567890',
        },
        node: {
          _id: 'id-123',
          _index: 'index-123',
          host: {
            name: ['hostname-1'],
            ip: ['hostip-1'],
          },
          geo: {
            region_name: ['geo-region-1'],
          },
          suricata: {
            eve: {
              proto: ['suricata-proto-1'],
              alert: {
                signature_id: [5000],
              },
            },
          },
        },
      };

      expect(data).toEqual(expected);
    });

    test('it formats a event data if fields are empty', () => {
      const fields: ReadonlyArray<string> = [];
      const data = formatEventsData(fields, hit, eventFieldsMap);
      const expected: EcsEdges = { cursor: { tiebreaker: null, value: '' }, node: { _id: '' } };

      expect(data).toEqual(expected);
    });
  });

  describe('#formatTimelineData', () => {
    test('it formats TimelineEdges from hit as expected ', () => {
      const datafields: ReadonlyArray<string> = [
        '@timestamp',
        'host.name',
        'suricata.eve.alert.signature_id',
      ];
      const ecsfields: ReadonlyArray<string> = ['host.name', 'suricata.eve.alert.signature_id'];
      const data = formatTimelineData(datafields, ecsfields, hit, eventFieldsMap);
      // TODO: Re-add TimelineEdges back once we settle on if data can contain numbers or not.
      // otherwise delete this test.
      const expected = {
        cursor: { tiebreaker: '1234', value: '123567890' },
        node: {
          _id: 'id-123',
          _index: 'index-123',
          data: [
            { field: 'host.name', value: ['hostname-1'] },
            { field: 'suricata.eve.alert.signature_id', value: [5000] },
            { field: '@timestamp', value: ['time-1'] },
          ],
          ecs: {
            _id: 'id-123',
            _index: 'index-123',
            host: { name: ['hostname-1'] },
            suricata: { eve: { alert: { signature_id: [5000] } } },
          },
        },
      };
      expect(data).toEqual(expected);
    });
  });

  describe('Timeline Details', () => {
    test('Happy Path ', async () => {
      const mockCallWithRequest = jest.fn();
      mockCallWithRequest.mockImplementation((req: FrameworkRequest, method: string) => {
        if (method === 'search') {
          return mockResponseSearchTimelineDetails;
        }
        return mockResponseMap;
      });
      const mockFramework: FrameworkAdapter = {
        version: 'mock',
        callWithRequest: mockCallWithRequest,
        exposeStaticDir: jest.fn(),
        registerGraphQLEndpoint: jest.fn(),
        getIndexPatternsService: jest.fn(),
        getSavedObjectsService: jest.fn(),
      };
      jest.doMock('../framework', () => ({
        callWithRequest: mockCallWithRequest,
      }));

      const EsNetworkTimelineDetail = new ElasticsearchEventsAdapter(mockFramework);
      const data: TimelineDetailsData = await EsNetworkTimelineDetail.getTimelineDetails(
        mockRequest as FrameworkRequest,
        mockOptions
      );

      expect(data).toEqual(mockTimelineDetailsResult);
    });
  });
});
