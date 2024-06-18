/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { renderHook } from '@testing-library/react-hooks';

import { useEsqlIndex } from './use_esql_index';

const validEsqlQuery = 'from auditbeat* metadata _id, _index, _version';
describe('useEsqlIndex', () => {
  it('should return parsed index array from a valid query', async () => {
    const { result } = renderHook(() => useEsqlIndex(validEsqlQuery, 'esql'));

    expect(result.current).toEqual(['auditbeat*']);
  });

  it('should return empty array if rule type is not esql', async () => {
    const { result } = renderHook(() => useEsqlIndex(validEsqlQuery, 'query'));
    expect(result.current).toEqual([]);
  });

  it('should return empty array if query is empty', async () => {
    const { result } = renderHook(() => useEsqlIndex('', 'esql'));

    expect(result.current).toEqual([]);
  });

  it('should return empty array if invalid query is causing a TypeError in ES|QL parser', async () => {
    const typeErrorCausingQuery = 'from auditbeat* []';

    const { result } = renderHook(() => useEsqlIndex(typeErrorCausingQuery, 'esql'));

    expect(result.current).toEqual([]);
  });
});
