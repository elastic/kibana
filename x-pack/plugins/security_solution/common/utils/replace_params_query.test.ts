/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { replaceParamsQuery } from './replace_params_query';

describe('replaceParamsQuery', () => {
  it('should return {params} if field is not found', () => {
    const query = 'SELECT * FROM processes WHERE version = {params.version}';
    const result = replaceParamsQuery(query, []);
    expect(result).toBe(query);
  });
  it('should return proper value instead of params if field is  found', () => {
    const query = 'SELECT * FROM processes WHERE version = {kibana.version}';
    const result = replaceParamsQuery(query, { kibana: { version: '8.7.0' } });
    const expectedQuery = 'SELECT * FROM processes WHERE version = 8.7.0';
    expect(result).toBe(expectedQuery);
  });
  it('should return both proper value and {params}', () => {
    const query =
      'SELECT * FROM processes WHERE version = {kibana.version} {not.existing} {agent.name}';
    const result = replaceParamsQuery(query, {
      kibana: { version: '8.7.0' },
      agent: { name: 'testAgent' },
    });
    const expectedQuery = 'SELECT * FROM processes WHERE version = 8.7.0 {not.existing} testAgent';
    expect(result).toBe(expectedQuery);
  });
  it('should return proper values even if params are duplicated', () => {
    const query =
      'SELECT * FROM processes WHERE version = {kibana.version} {not.existing} {kibana.version} {kibana.version} {agent.name}';
    const result = replaceParamsQuery(query, {
      kibana: { version: '8.7.0' },
      agent: { name: 'testAgent' },
    });
    const expectedQuery =
      'SELECT * FROM processes WHERE version = 8.7.0 {not.existing} 8.7.0 8.7.0 testAgent';
    expect(result).toBe(expectedQuery);
  });
});
