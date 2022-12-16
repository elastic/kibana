/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stripNonEcsFields } from './strip_non_ecs_fields';

describe('stripNonEcsFields', () => {
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

    const { result, removed } = stripNonEcsFields(document);

    expect(result).toEqual(document);
    expect(removed).toEqual([]);
  });

  it('should strip source object field if ECS mapping is not object', () => {
    const { result, removed } = stripNonEcsFields({
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
    const { result, removed } = stripNonEcsFields({
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

  describe('array fields', () => {
    it('should not strip arrays of objects when an object is expected', () => {
      const { result, removed } = stripNonEcsFields({
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
      const { result, removed } = stripNonEcsFields({
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
      const { result, removed } = stripNonEcsFields({
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
      const { result, removed } = stripNonEcsFields({
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

    it('should strip conflicting fields that use dot notation', () => {
      expect(
        stripNonEcsFields({
          'agent.name.conflict': 'some-value',
          message: 'test message',
        })
      ).toEqual({
        result: {
          message: 'test message',
        },
        removed: [
          {
            key: 'agent.name.conflict',
            value: 'some-value',
          },
        ],
      });
    });
  });

  describe('non-ECS fields', () => {
    it('should not strip non-ECS fields that don`t conflict', () => {
      expect(
        stripNonEcsFields({
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
      });
    });

    it('should not strip non-ECS fields that don`t conflict even when nested inside ECS fieldsets', () => {
      expect(
        stripNonEcsFields({
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
      });
    });
  });

  //   it('should strip source histogram field if ECS mapping is not histogram', () => {});
});
