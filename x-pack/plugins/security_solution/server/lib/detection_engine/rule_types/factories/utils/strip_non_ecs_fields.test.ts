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
        ip: '127.0.0.1',
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
    expect(
      stripNonEcsFields({
        agent: 'test',
        message: 'test message',
      })
    ).toEqual({
      result: {
        message: 'test message',
      },
      removed: [
        {
          key: 'agent',
          value: 'test',
        },
      ],
    });
  });

  //   it('should strip source histogram field if ECS mapping is not histogram', () => {});
});
