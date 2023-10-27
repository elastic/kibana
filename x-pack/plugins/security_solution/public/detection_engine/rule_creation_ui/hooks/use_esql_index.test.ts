/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { renderHook } from '@testing-library/react-hooks';

import { useEsqlIndex } from './use_esql_index';

const validEsqlQuery = 'from auditbeat* [metadata _id, _index, _version]';
describe('useEsqlIndex', () => {
  it('should return empty array if isQueryReadEnabled is undefined', () => {
    const { result } = renderHook(() => useEsqlIndex(validEsqlQuery, 'esql', undefined));

    expect(result.current).toEqual([]);
  });
  it('should return empty array if isQueryReadEnabled is false', () => {
    const { result } = renderHook(() => useEsqlIndex(validEsqlQuery, 'esql', false));

    expect(result.current).toEqual([]);
  });
  it('should return empty array if rule type is not esql', () => {
    const { result } = renderHook(() => useEsqlIndex(validEsqlQuery, 'query', true));

    expect(result.current).toEqual([]);
  });
  it('should return empty array if query is empty', () => {
    const { result } = renderHook(() => useEsqlIndex('', 'esql', true));

    expect(result.current).toEqual([]);
  });
  it('should return parsed index array from a valid query', () => {
    const { result } = renderHook(() => useEsqlIndex(validEsqlQuery, 'esql', true));

    expect(result.current).toEqual(['auditbeat*']);
  });
});
