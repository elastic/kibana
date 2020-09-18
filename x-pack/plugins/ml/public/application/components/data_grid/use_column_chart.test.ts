/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getFieldType } from './use_column_chart';

describe('getFieldType()', () => {
  it('should return the Kibana field type for a given EUI data grid schema', () => {
    expect(getFieldType('text')).toBe('string');
    expect(getFieldType('datetime')).toBe('date');
    expect(getFieldType('numeric')).toBe('number');
    expect(getFieldType('boolean')).toBe('boolean');
    expect(getFieldType('json')).toBe('object');
    expect(getFieldType('non-aggregatable')).toBe(undefined);
  });
});
