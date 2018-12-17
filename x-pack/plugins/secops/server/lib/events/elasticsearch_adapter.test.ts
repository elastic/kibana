/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { formatEventsData } from './elasticsearch_adapter';
import { eventFieldsMap } from './query.dsl';
import { EventData } from './types';

describe('events elasticsearch_adapter', () => {
  describe('#formatEventsData', () => {
    const hit: EventData = {
      _index: 'index-123',
      _type: 'type-123',
      _id: 'id-123',
      _score: 10,
      aggregations: {},
      _source: {
        '@timestamp': 'time-1',
        host: {
          name: 'hostname-1',
          ip: 'hostip-1',
        },
        suricata: {
          eve: {
            alert: {
              category: 'suricata-category-1',
              signature: 'suricata-signature-1',
              signature_id: 'suricata-signature-id-1',
              severity: 'suricata-severity-1',
            },
            flow_id: 'suricata-flow-id-1',
            proto: 'suricata-proto-1',
          },
        },
        source: {
          ip: 'source-ip-1',
          port: 100,
        },
        destination: {
          ip: 'destination-ip-1',
          port: 200,
          geo: {
            region_name: 'geo-region-1',
            country_iso_code: 'geo-iso-code-1',
          },
        },
        event: {
          module: 'event-module-1',
          type: 'event-type-1',
        },
      },
      sort: ['0'],
    };

    test('it formats an event with a source of hostname correctly', () => {
      const fields: ReadonlyArray<string> = ['host.hostname'];
      const data = formatEventsData(fields, hit, eventFieldsMap);
      expect(data).toEqual({
        _id: 'id-123',
        host: {
          hostname: 'hostname-1',
        },
      });
    });

    test('it formats an event with a source of host ip correctly', () => {
      const fields: ReadonlyArray<string> = ['host.ip'];
      const data = formatEventsData(fields, hit, eventFieldsMap);
      expect(data).toEqual({
        _id: 'id-123',
        host: {
          ip: 'hostip-1',
        },
      });
    });

    test('it formats an event with a event category correctly', () => {
      const fields: ReadonlyArray<string> = ['event.category'];
      const data = formatEventsData(fields, hit, eventFieldsMap);
      expect(data).toEqual({
        _id: 'id-123',
        event: {
          category: 'suricata-category-1',
        },
      });
    });

    test('it formats an event with a event id correctly', () => {
      const fields: ReadonlyArray<string> = ['event.id'];
      const data = formatEventsData(fields, hit, eventFieldsMap);
      expect(data).toEqual({
        _id: 'id-123',
        event: {
          id: 'suricata-flow-id-1',
        },
      });
    });

    test('it formats an event with a event module correctly', () => {
      const fields: ReadonlyArray<string> = ['event.module'];
      const data = formatEventsData(fields, hit, eventFieldsMap);
      expect(data).toEqual({
        _id: 'id-123',
        event: {
          module: 'event-module-1',
        },
      });
    });

    test('it formats an event with a event type correctly', () => {
      const fields: ReadonlyArray<string> = ['event.type'];
      const data = formatEventsData(fields, hit, eventFieldsMap);
      expect(data).toEqual({
        _id: 'id-123',
        event: {
          type: 'event-type-1',
        },
      });
    });

    test('it formats an event with a event severity correctly', () => {
      const fields: ReadonlyArray<string> = ['event.severity'];
      const data = formatEventsData(fields, hit, eventFieldsMap);
      expect(data).toEqual({
        _id: 'id-123',
        event: {
          severity: 'suricata-severity-1',
        },
      });
    });

    test('it formats an event with a suricata eve flow id correctly', () => {
      const fields: ReadonlyArray<string> = ['suricata.eve.flow_id'];
      const data = formatEventsData(fields, hit, eventFieldsMap);
      expect(data).toEqual({
        _id: 'id-123',
        suricata: {
          eve: {
            flow_id: 'suricata-flow-id-1',
          },
        },
      });
    });

    test('it formats an event with a suricata eve proto correctly', () => {
      const fields: ReadonlyArray<string> = ['suricata.eve.proto'];
      const data = formatEventsData(fields, hit, eventFieldsMap);
      expect(data).toEqual({
        _id: 'id-123',
        suricata: {
          eve: {
            proto: 'suricata-proto-1',
          },
        },
      });
    });

    test('it formats an event with a suricata eve alert signature correctly', () => {
      const fields: ReadonlyArray<string> = ['suricata.eve.alert.signature'];
      const data = formatEventsData(fields, hit, eventFieldsMap);
      expect(data).toEqual({
        _id: 'id-123',
        suricata: {
          eve: {
            alert: {
              signature: 'suricata-signature-1',
            },
          },
        },
      });
    });

    test('it formats an event with a suricata eve alert signature id correctly', () => {
      const fields: ReadonlyArray<string> = ['suricata.eve.alert.signature_id'];
      const data = formatEventsData(fields, hit, eventFieldsMap);
      expect(data).toEqual({
        _id: 'id-123',
        suricata: {
          eve: {
            alert: {
              signature_id: 'suricata-signature-id-1',
            },
          },
        },
      });
    });

    test('it formats an event with a source ip correctly', () => {
      const fields: ReadonlyArray<string> = ['source.ip'];
      const data = formatEventsData(fields, hit, eventFieldsMap);
      expect(data).toEqual({
        _id: 'id-123',
        source: {
          ip: 'source-ip-1',
        },
      });
    });

    test('it formats an event with a source port correctly', () => {
      const fields: ReadonlyArray<string> = ['source.port'];
      const data = formatEventsData(fields, hit, eventFieldsMap);
      expect(data).toEqual({
        _id: 'id-123',
        source: {
          port: 100,
        },
      });
    });

    test('it formats an event with a destination ip correctly', () => {
      const fields: ReadonlyArray<string> = ['destination.ip'];
      const data = formatEventsData(fields, hit, eventFieldsMap);
      expect(data).toEqual({
        _id: 'id-123',
        destination: {
          ip: 'destination-ip-1',
        },
      });
    });

    test('it formats an event with a destination port correctly', () => {
      const fields: ReadonlyArray<string> = ['destination.port'];
      const data = formatEventsData(fields, hit, eventFieldsMap);
      expect(data).toEqual({
        _id: 'id-123',
        destination: {
          port: 200,
        },
      });
    });

    test('it formats an event with a geo region name correctly', () => {
      const fields: ReadonlyArray<string> = ['geo.region_name'];
      const data = formatEventsData(fields, hit, eventFieldsMap);
      expect(data).toEqual({
        _id: 'id-123',
        geo: {
          region_name: 'geo-region-1',
        },
      });
    });

    test('it formats an event with a geo country iso code correctly', () => {
      const fields: ReadonlyArray<string> = ['geo.country_iso_code'];
      const data = formatEventsData(fields, hit, eventFieldsMap);
      expect(data).toEqual({
        _id: 'id-123',
        geo: {
          country_iso_code: 'geo-iso-code-1',
        },
      });
    });

    test('it formats an event with a lot of fields correctly', () => {
      const fields: ReadonlyArray<string> = [
        'host.hostname',
        'host.ip',
        'suricata.eve.proto',
        'suricata.eve.alert.signature_id',
        'geo.region_name',
      ];
      const data = formatEventsData(fields, hit, eventFieldsMap);
      expect(data).toEqual({
        _id: 'id-123',
        host: {
          hostname: 'hostname-1',
          ip: 'hostip-1',
        },
        geo: {
          region_name: 'geo-region-1',
        },
        suricata: {
          eve: {
            proto: 'suricata-proto-1',
            alert: {
              signature_id: 'suricata-signature-id-1',
            },
          },
        },
      });
    });

    test('it formats a event data if fields are empty', () => {
      const fields: ReadonlyArray<string> = [];
      const data = formatEventsData(fields, hit, eventFieldsMap);
      expect(data).toEqual({});
    });
  });
});
