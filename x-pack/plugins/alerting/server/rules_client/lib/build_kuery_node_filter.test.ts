/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromKueryExpression } from '@kbn/es-query';
import { buildKueryNodeFilter } from './build_kuery_node_filter';

describe('buildKueryNodeFilter', () => {
  test('should convert KQL string into Kuery', () => {
    expect(buildKueryNodeFilter('foo: "bar"')).toEqual({
      arguments: [
        { type: 'literal', value: 'foo', isQuoted: false },
        { type: 'literal', value: 'bar', isQuoted: true },
      ],
      function: 'is',
      type: 'function',
    });
  });

  test('should NOT do anything if filter is KueryNode', () => {
    expect(buildKueryNodeFilter(fromKueryExpression('foo: "bar"'))).toEqual(
      fromKueryExpression('foo: "bar"')
    );
  });

  test('should return null if filter is not defined', () => {
    expect(buildKueryNodeFilter()).toEqual(null);
  });

  test('should return null if filter is null', () => {
    expect(buildKueryNodeFilter(null)).toEqual(null);
  });
});
