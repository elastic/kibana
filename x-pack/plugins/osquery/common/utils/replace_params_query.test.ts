/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { replaceParamsQuery } from './replace_params_query';

describe('replaceParamsQuery', () => {
  it('should return unchanged query, and skipped true', () => {
    const query = 'SELECT * FROM processes WHERE version = {{params.version}}';
    const { result, skipped } = replaceParamsQuery(query, {});
    expect(result).toBe(query);
    expect(skipped).toBe(true);
  });
  it('should return proper value instead of params if field is found', () => {
    const query = 'SELECT * FROM processes WHERE version = {{kibana.version}}';
    const { result, skipped } = replaceParamsQuery(query, { kibana: { version: '8.7.0' } });
    const expectedQuery = 'SELECT * FROM processes WHERE version = 8.7.0';
    expect(result).toBe(expectedQuery);
    expect(skipped).toBe(false);
  });
  it('should return proper value instead of params with multiple params', () => {
    const query =
      'SELECT * FROM processes WHERE version = {{kibana.version}} and pid = {{kibana.pid}}';
    const { result, skipped } = replaceParamsQuery(query, {
      kibana: { version: '8.7.0', pid: '123' },
    });
    const expectedQuery = 'SELECT * FROM processes WHERE version = 8.7.0 and pid = 123';
    expect(result).toBe(expectedQuery);
    expect(skipped).toBe(false);
  });
  it('should return proper value if param has white spaces inside', () => {
    const query = 'SELECT * FROM processes WHERE version = {{  kibana.version  }}';
    const { result, skipped } = replaceParamsQuery(query, { kibana: { version: '8.7.0' } });
    const expectedQuery = 'SELECT * FROM processes WHERE version = 8.7.0';
    expect(result).toBe(expectedQuery);
    expect(skipped).toBe(false);
  });

  it('should not change query if there are no opening curly braces but still skipped false', () => {
    const query = 'SELECT * FROM processes WHERE version = kibana.version }}';
    const { result, skipped } = replaceParamsQuery(query, { kibana: { version: '8.7.0' } });
    const expectedQuery = 'SELECT * FROM processes WHERE version = kibana.version }}';
    expect(result).toBe(expectedQuery);
    expect(skipped).toBe(false);
  });
  it('should return skipped true if {{params}} field not found', () => {
    const query =
      'SELECT * FROM processes WHERE version = {{kibana.version}} {{not.existing}} {{agent.name}}';
    const { result, skipped } = replaceParamsQuery(query, {
      kibana: { version: '8.7.0' },
      agent: { name: 'testAgent' },
    });
    const expectedQuery =
      'SELECT * FROM processes WHERE version = 8.7.0 {{not.existing}} testAgent';
    expect(result).toBe(expectedQuery);
    expect(skipped).toBe(true);
  });
  it('should return replaced values even if params are duplicated, but also return skip true', () => {
    const query =
      'SELECT * FROM processes WHERE version = {{  kibana.version}} {{not.existing  }} {{kibana.version}} {{kibana.version}} {{agent.name}}';
    const { result, skipped } = replaceParamsQuery(query, {
      kibana: { version: '8.7.0' },
      agent: { name: 'testAgent' },
    });
    const expectedQuery =
      'SELECT * FROM processes WHERE version = 8.7.0 {{not.existing  }} 8.7.0 8.7.0 testAgent';
    expect(result).toBe(expectedQuery);
    expect(skipped).toBe(true);
  });

  it('handle complex windows query with registry as param', () => {
    // eslint-disable-next-line no-useless-escape
    const query = `select * FROM registry WHERE key LIKE 'HKEY_USERS\{{user.id}}\Software\Microsoft\IdentityCRL\Immersive\production\Token\{0CB4A94A-6E8C-477B-88C8-A3799FC97414}'`;
    const { result, skipped } = replaceParamsQuery(query, {
      user: { id: 'S-1-5-20' },
    });
    // eslint-disable-next-line no-useless-escape
    const expectedQuery = `select * FROM registry WHERE key LIKE 'HKEY_USERS\S-1-5-20\Software\Microsoft\IdentityCRL\Immersive\production\Token\{0CB4A94A-6E8C-477B-88C8-A3799FC97414}'`;
    expect(result).toBe(expectedQuery);
    expect(skipped).toBe(false);
  });
});
