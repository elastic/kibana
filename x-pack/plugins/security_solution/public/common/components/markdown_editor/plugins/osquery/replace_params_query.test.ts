/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { replaceParamsQuery } from './replace_params_query';

describe('replaceParamsQuery', () => {
  const defaultData = {
    isObjectArray: false,
    originalValue: ['low'],
    category: 'kibana',
  };
  it('should return {params} if field is not found', () => {
    const query = 'SELECT * FROM processes WHERE pid = {params.pid}';
    const result = replaceParamsQuery(query, []);
    expect(result).toBe(query);
  });
  it('should return proper value instead of params if field is  found', () => {
    const query = 'SELECT * FROM processes WHERE pid = {params.pid}';
    const result = replaceParamsQuery(query, [
      { ...defaultData, field: 'params.pid', values: ['testValue'] },
    ]);
    const expectedQuery = 'SELECT * FROM processes WHERE pid = testValue';
    expect(result).toBe(expectedQuery);
  });
  it('should return both proper value and {params}', () => {
    const query =
      'SELECT * FROM processes WHERE pid = {params.pid} {not.existing} {another.existing}';
    const result = replaceParamsQuery(query, [
      { ...defaultData, field: 'params.pid', values: ['testValue'] },
      { ...defaultData, field: 'another.existing', values: ['anotherValue'] },
    ]);
    const expectedQuery =
      'SELECT * FROM processes WHERE pid = testValue {not.existing} anotherValue';
    expect(result).toBe(expectedQuery);
  });
});
