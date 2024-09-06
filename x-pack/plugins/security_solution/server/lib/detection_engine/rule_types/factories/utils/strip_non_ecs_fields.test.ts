/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { traverseDoc } from './strip_non_ecs_fields';

describe('traverseDoc', () => {
  it('should not strip ECS compliant fields', () => {
    const document = {
      client: {
        nat: {
          port: '3000',
          ip: '127.0.0.2',
        },
        ip: ['127.0.0.1'],
      },
    };

    const { result, removed } = traverseDoc(document);

    expect(result).toEqual(document);
    expect(removed).toEqual([]);
  });

  it('should strip source object field if ECS mapping is not object', () => {
    const { result, removed } = traverseDoc({
      agent: {
        name: {
          first: 'test-1',
          second: 'test-2',
        },
        type: 'filebeat',
      },
    });

    expect(result).toEqual({
      agent: {
        type: 'filebeat',
      },
    });

    expect(removed).toEqual([
      {
        key: 'agent.name',
        value: {
          first: 'test-1',
          second: 'test-2',
        },
      },
    ]);
  });

  it('should strip source keyword field if ECS mapping is object', () => {
    const { result, removed } = traverseDoc({
      agent: 'test',
      message: 'test message',
    });

    expect(result).toEqual({
      message: 'test message',
    });

    expect(removed).toEqual([
      {
        key: 'agent',
        value: 'test',
      },
    ]);
  });

  // https://github.com/elastic/sdh-security-team/issues/736
  describe('fields that exists in the alerts mapping but not in local ECS(ruleRegistry) definition', () => {
    it('should strip object type "device" field if it is supplied as a keyword', () => {
      const { result, removed } = traverseDoc({
        device: 'test',
        message: 'test message',
      });

      expect(result).toEqual({
        message: 'test message',
      });

      expect(removed).toEqual([
        {
          key: 'device',
          value: 'test',
        },
      ]);
    });
  });

  describe('array fields', () => {
    it('should not strip arrays of objects when an object is expected', () => {
      const { result, removed } = traverseDoc({
        agent: [{ name: 'agent-1' }, { name: 'agent-2' }],
        message: 'test message',
      });

      expect(result).toEqual({
        agent: [{ name: 'agent-1' }, { name: 'agent-2' }],
        message: 'test message',
      });
      expect(removed).toEqual([]);
    });

    it('should strip conflicting fields in array of objects', () => {
      const { result, removed } = traverseDoc({
        agent: [
          {
            name: 'agent-1',
            type: {
              conflict: 'conflict',
            },
          },
          { name: 'agent-2' },
        ],
        message: 'test message',
      });

      expect(result).toEqual({
        agent: [{ name: 'agent-1' }, { name: 'agent-2' }],
        message: 'test message',
      });
      expect(removed).toEqual([
        {
          key: 'agent.type',
          value: {
            conflict: 'conflict',
          },
        },
      ]);
    });

    it('should strip conflicting array of keyword fields', () => {
      const { result, removed } = traverseDoc({
        agent: ['agent-1', 'agent-2'],
        message: 'test message',
      });

      expect(result).toEqual({
        message: 'test message',
      });
      expect(removed).toEqual([
        {
          key: 'agent',
          value: 'agent-1',
        },
        {
          key: 'agent',
          value: 'agent-2',
        },
      ]);
    });

    it('should strip conflicting array of object fields', () => {
      const { result, removed } = traverseDoc({
        agent: { name: [{ conflict: 'agent-1' }, { conflict: 'agent-2' }], type: 'filebeat' },
        message: 'test message',
      });

      expect(result).toEqual({
        agent: { type: 'filebeat' },
        message: 'test message',
      });
      expect(removed).toEqual([
        {
          key: 'agent.name',
          value: { conflict: 'agent-1' },
        },
        {
          key: 'agent.name',
          value: { conflict: 'agent-2' },
        },
      ]);
    });
  });

  describe('dot notation', () => {
    it('should strip conflicting fields that use dot notation', () => {
      const { result, removed } = traverseDoc({
        'agent.name.conflict': 'some-value',
        message: 'test message',
      });

      expect(result).toEqual({
        message: 'test message',
      });

      expect(removed).toEqual([
        {
          key: 'agent.name.conflict',
          value: 'some-value',
        },
      ]);
    });

    it('should strip conflicting fields that use dot notation and is an array', () => {
      const { result, removed } = traverseDoc({
        'agent.name.text': ['1'],
        message: 'test message',
      });

      expect(result).toEqual({
        message: 'test message',
      });

      expect(removed).toEqual([
        {
          key: 'agent.name.text',
          value: '1',
        },
      ]);
    });

    it('should strip conflicting fields that use dot notation and is an empty array but not report the empty array as removed', () => {
      const { result, removed } = traverseDoc({
        'agent.name.text': [],
        message: 'test message',
      });

      expect(result).toEqual({
        message: 'test message',
      });

      expect(removed).toEqual([]);
    });

    it('should not strip valid ECS fields that use dot notation', () => {
      const { result, removed } = traverseDoc({
        'agent.name': 'some name',
        'agent.build.original': 'v10',
        message: 'test message',
      });

      expect(result).toEqual({
        'agent.name': 'some name',
        'agent.build.original': 'v10',
        message: 'test message',
      });

      expect(removed).toEqual([]);
    });
  });

  describe('non-ECS fields', () => {
    it('should not strip non-ECS fields that don`t conflict', () => {
      expect(
        traverseDoc({
          non_ecs_object: {
            field1: 'value1',
          },
          message: 'test message',
        })
      ).toEqual({
        result: {
          non_ecs_object: {
            field1: 'value1',
          },
          message: 'test message',
        },
        removed: [],
        fieldsToAdd: [],
      });
    });

    it('should not strip non-ECS fields that don`t conflict even when nested inside ECS fieldsets', () => {
      expect(
        traverseDoc({
          agent: {
            non_ecs_object: {
              field1: 'value1',
            },
            non_ecs_field: 'value2',
          },
          message: 'test message',
        })
      ).toEqual({
        result: {
          agent: {
            non_ecs_object: {
              field1: 'value1',
            },
            non_ecs_field: 'value2',
          },
          message: 'test message',
        },
        removed: [],
        fieldsToAdd: [],
      });
    });
  });

  describe('ip field', () => {
    it('should not strip valid CIDR', () => {
      const { result, removed } = traverseDoc({
        source: {
          ip: '192.168.0.0',
          name: 'test source',
        },
      });

      expect(result).toEqual({
        source: {
          ip: '192.168.0.0',
          name: 'test source',
        },
      });
      expect(removed).toEqual([]);
    });

    it('should strip invalid ip', () => {
      const { result, removed } = traverseDoc({
        source: {
          ip: 'invalid-ip',
          name: 'test source',
        },
      });

      expect(result).toEqual({
        source: { name: 'test source' },
      });
      expect(removed).toEqual([
        {
          key: 'source.ip',
          value: 'invalid-ip',
        },
      ]);
    });
  });

  describe('nested field', () => {
    it('should strip invalid nested', () => {
      const { result, removed } = traverseDoc({
        threat: {
          enrichments: ['non-valid-threat-1', 'non-valid-threat-2'],
          'indicator.port': 443,
        },
      });

      expect(result).toEqual({
        threat: {
          'indicator.port': 443,
        },
      });
      expect(removed).toEqual([
        {
          key: 'threat.enrichments',
          value: 'non-valid-threat-1',
        },
        {
          key: 'threat.enrichments',
          value: 'non-valid-threat-2',
        },
      ]);
    });

    it('should not strip valid values', () => {
      const { result, removed } = traverseDoc({
        threat: {
          enrichments: [
            {
              'indicator.as.number': 5,
            },
          ],
        },
      });

      expect(result).toEqual({
        threat: {
          enrichments: [
            {
              'indicator.as.number': 5,
            },
          ],
        },
      });
      expect(removed).toEqual([]);
    });
  });

  describe('date field', () => {
    it('should strip invalid date', () => {
      const { result, removed } = traverseDoc({
        event: {
          created: true,
          category: 'start',
        },
      });

      expect(result).toEqual({
        event: {
          category: 'start',
        },
      });
      expect(removed).toEqual([
        {
          key: 'event.created',
          value: true,
        },
      ]);
    });

    it('should not strip string or number date field', () => {
      const { result, removed } = traverseDoc({
        event: {
          created: '2020-12-12',
          end: [2345562, '2022-10-12'],
        },
      });

      expect(result).toEqual({
        event: {
          created: '2020-12-12',
          end: [2345562, '2022-10-12'],
        },
      });
      expect(removed).toEqual([]);
    });
  });

  describe('long field', () => {
    it('should strip invalid long field', () => {
      const { result, removed } = traverseDoc({
        client: {
          bytes: 'non-valid',
        },
      });

      expect(result).toEqual({ client: {} });
      expect(removed).toEqual([
        {
          key: 'client.bytes',
          value: 'non-valid',
        },
      ]);
    });

    it('should strip invalid long field with space in it', () => {
      const { result, removed } = traverseDoc({
        client: {
          bytes: '24 ',
        },
      });

      expect(result).toEqual({ client: {} });
      expect(removed).toEqual([
        {
          key: 'client.bytes',
          value: '24 ',
        },
      ]);
    });
  });
  describe('numeric field', () => {
    it('should strip invalid float field', () => {
      const { result, removed } = traverseDoc({
        'user.risk.calculated_score': 'non-valid',
      });

      expect(result).toEqual({});
      expect(removed).toEqual([
        {
          key: 'user.risk.calculated_score',
          value: 'non-valid',
        },
      ]);
    });

    it('should strip invalid scaled_float field', () => {
      const { result, removed } = traverseDoc({
        host: {
          'cpu.usage': 'non-valid',
        },
      });

      expect(result).toEqual({ host: {} });
      expect(removed).toEqual([
        {
          key: 'host.cpu.usage',
          value: 'non-valid',
        },
      ]);
    });

    it('should not strip string float field with space', () => {
      const { result, removed } = traverseDoc({
        'user.risk.calculated_score': '24 ',
      });

      expect(result).toEqual({
        'user.risk.calculated_score': '24 ',
      });
      expect(removed).toEqual([]);
    });

    it('should not strip string scaled_float field with space', () => {
      const { result, removed } = traverseDoc({
        'host.cpu.usage': '24 ',
      });

      expect(result).toEqual({
        'host.cpu.usage': '24 ',
      });
      expect(removed).toEqual([]);
    });

    it('should not strip valid number in string field', () => {
      const { result, removed } = traverseDoc({
        host: {
          'cpu.usage': '1234',
        },
      });

      expect(result).toEqual({
        host: {
          'cpu.usage': '1234',
        },
      });
      expect(removed).toEqual([]);
    });

    it('should not strip array of valid numeric fields', () => {
      const { result, removed } = traverseDoc({
        'user.risk.calculated_score': [458.3333, '45.3', 10, 0, -667.23],
      });

      expect(result).toEqual({
        'user.risk.calculated_score': [458.3333, '45.3', 10, 0, -667.23],
      });
      expect(removed).toEqual([]);
    });
  });

  describe('boolean field', () => {
    it('should strip invalid boolean fields', () => {
      const { result, removed } = traverseDoc({
        'dll.code_signature.trusted': ['conflict', 'true', 5, 'False', 'ee', 'True'],
      });

      expect(result).toEqual({
        'dll.code_signature.trusted': ['true'],
      });
      expect(removed).toEqual([
        {
          key: 'dll.code_signature.trusted',
          value: 'conflict',
        },
        {
          key: 'dll.code_signature.trusted',
          value: 5,
        },
        {
          key: 'dll.code_signature.trusted',
          value: 'False',
        },
        {
          key: 'dll.code_signature.trusted',
          value: 'ee',
        },
        {
          key: 'dll.code_signature.trusted',
          value: 'True',
        },
      ]);
    });

    it('should strip invalid boolean True', () => {
      const { result, removed } = traverseDoc({
        'dll.code_signature.trusted': 'True',
      });

      expect(result).toEqual({});
      expect(removed).toEqual([
        {
          key: 'dll.code_signature.trusted',
          value: 'True',
        },
      ]);
    });

    it('should not strip valid boolean fields', () => {
      const { result, removed } = traverseDoc({
        'dll.code_signature.trusted': ['true', 'false', true, false, ''],
      });

      expect(result).toEqual({
        'dll.code_signature.trusted': ['true', 'false', true, false, ''],
      });
      expect(removed).toEqual([]);
    });

    it('should not strip valid boolean fields nested in array', () => {
      const { result, removed } = traverseDoc({
        'dll.code_signature.trusted': [[true, false], ''],
      });

      expect(result).toEqual({
        'dll.code_signature.trusted': [[true, false], ''],
      });
      expect(removed).toEqual([]);
    });
  });

  // geo_point is too complex so we going to skip its validation
  describe('geo_point field', () => {
    it('should not strip invalid geo_point field', () => {
      const { result, removed } = traverseDoc({
        'client.location.geo': 'invalid geo_point',
      });

      expect(result).toEqual({
        'client.location.geo': 'invalid geo_point',
      });
      expect(removed).toEqual([]);
    });

    it('should not strip valid geo_point fields', () => {
      expect(
        traverseDoc({
          'client.geo.location': [0, 90],
        }).result
      ).toEqual({
        'client.geo.location': [0, 90],
      });

      expect(
        traverseDoc({
          'client.geo.location': {
            type: 'Point',
            coordinates: [-88.34, 20.12],
          },
        }).result
      ).toEqual({
        'client.geo.location': {
          type: 'Point',
          coordinates: [-88.34, 20.12],
        },
      });

      expect(
        traverseDoc({
          'client.geo.location': 'POINT (-71.34 41.12)',
        }).result
      ).toEqual({
        'client.geo.location': 'POINT (-71.34 41.12)',
      });

      expect(
        traverseDoc({
          client: {
            geo: {
              location: {
                lat: 41.12,
                lon: -71.34,
              },
            },
          },
        }).result
      ).toEqual({
        client: {
          geo: {
            location: {
              lat: 41.12,
              lon: -71.34,
            },
          },
        },
      });
    });
  });

  describe('globally ignored fields', () => {
    it('should strip out globally ignored top level fields', () => {
      const { result, removed } = traverseDoc({
        kibana: 'test-value',
        non_ecs_field: 'value',
      });

      expect(result).toEqual({
        non_ecs_field: 'value',
      });
      expect(removed).toEqual([
        {
          key: 'kibana',
          value: 'test-value',
        },
      ]);
    });

    it('should strip out globally ignored nested fields', () => {
      const { result, removed } = traverseDoc({
        'kibana.test': 'test-value',
        non_ecs_field: 'value',
      });

      expect(result).toEqual({
        non_ecs_field: 'value',
      });
      expect(removed).toEqual([
        {
          key: 'kibana.test',
          value: 'test-value',
        },
      ]);
    });

    it('should not strip out fields that use ignored field names as a prefix', () => {
      const { result, removed } = traverseDoc({
        kibana_test_prefix: 'test-value',
        non_ecs_field: 'value',
      });

      expect(result).toEqual({
        kibana_test_prefix: 'test-value',
        non_ecs_field: 'value',
      });
      expect(removed).toEqual([]);
    });
  });

  describe('fieldsToAdd', () => {
    it('should extract a nested event field to kibana.alert.original_event', () => {
      const { result, removed, fieldsToAdd } = traverseDoc({ event: { action: 'test' } });
      expect(result).toEqual({ event: { action: 'test' } });
      expect(removed).toEqual([]);
      expect(fieldsToAdd).toEqual([{ key: 'kibana.alert.original_event.action', value: 'test' }]);
    });

    it('should extract multiple nested event fields to kibana.alert.original_event', () => {
      const { result, removed, fieldsToAdd } = traverseDoc({
        event: { action: 'test', field2: 'test2' },
      });
      expect(result).toEqual({ event: { action: 'test', field2: 'test2' } });
      expect(removed).toEqual([]);
      expect(fieldsToAdd).toEqual([
        { key: 'kibana.alert.original_event.action', value: 'test' },
        { key: 'kibana.alert.original_event.field2', value: 'test2' },
      ]);
    });

    it('should extract a dot notation event field to kibana.alert.original_event', () => {
      const { result, removed, fieldsToAdd } = traverseDoc({ 'event.action': 'test' });
      expect(result).toEqual({ 'event.action': 'test' });
      expect(removed).toEqual([]);
      expect(fieldsToAdd).toEqual([{ key: 'kibana.alert.original_event.action', value: 'test' }]);
    });

    it('should extract multiple dot notation event fields to kibana.alert.original_event', () => {
      const { result, removed, fieldsToAdd } = traverseDoc({
        'event.action': 'test',
        'event.field2': 'test2',
      });
      expect(result).toEqual({ 'event.action': 'test', 'event.field2': 'test2' });
      expect(removed).toEqual([]);
      expect(fieldsToAdd).toEqual([
        { key: 'kibana.alert.original_event.action', value: 'test' },
        { key: 'kibana.alert.original_event.field2', value: 'test2' },
      ]);
    });

    it('should extract mixed notation fields to kibana.alert.original_event', () => {
      const { result, removed, fieldsToAdd } = traverseDoc({
        event: { 'field.subfield': 'test', 'field2.subfield': 'test2' },
      });
      expect(result).toEqual({
        event: { 'field.subfield': 'test', 'field2.subfield': 'test2' },
      });
      expect(removed).toEqual([]);
      expect(fieldsToAdd).toEqual([
        { key: 'kibana.alert.original_event.field.subfield', value: 'test' },
        { key: 'kibana.alert.original_event.field2.subfield', value: 'test2' },
      ]);
    });

    it('should extract mixed notation with dot notation first to kibana.alert.original_event', () => {
      const { result, removed, fieldsToAdd } = traverseDoc({
        'event.field': { subfield: 'test', subfield2: 'test2' },
      });
      expect(result).toEqual({
        'event.field': { subfield: 'test', subfield2: 'test2' },
      });
      expect(removed).toEqual([]);
      expect(fieldsToAdd).toEqual([
        { key: 'kibana.alert.original_event.field.subfield', value: 'test' },
        { key: 'kibana.alert.original_event.field.subfield2', value: 'test2' },
      ]);
    });

    it('should not extract original event fields if they are not top level', () => {
      const { result, removed, fieldsToAdd } = traverseDoc({ 'top_field.event.action': 'test' });
      expect(result).toEqual({ 'top_field.event.action': 'test' });
      expect(removed).toEqual([]);
      expect(fieldsToAdd).toEqual([]);
    });

    it('should not duplicate added fields', () => {
      const { result, removed, fieldsToAdd } = traverseDoc({ event: { event: 'test' } });
      expect(result).toEqual({ event: { event: 'test' } });
      expect(removed).toEqual([]);
      expect(fieldsToAdd).toEqual([{ key: 'kibana.alert.original_event.event', value: 'test' }]);
    });

    it('should work on multiple levels of nesting', () => {
      const { result, removed, fieldsToAdd } = traverseDoc({
        event: { field: { subfield: 'test', subfield2: 'test2' } },
      });
      expect(result).toEqual({
        event: { field: { subfield: 'test', subfield2: 'test2' } },
      });
      expect(removed).toEqual([]);
      expect(fieldsToAdd).toEqual([
        { key: 'kibana.alert.original_event.field.subfield', value: 'test' },
        { key: 'kibana.alert.original_event.field.subfield2', value: 'test2' },
      ]);
    });
  });
});
