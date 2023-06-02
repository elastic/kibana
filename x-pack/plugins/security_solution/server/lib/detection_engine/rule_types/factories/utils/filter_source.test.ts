/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filterSource } from './filter_source';

describe('filterSource', () => {
  test('should remove keys starting with kibana without modifying the original doc', () => {
    const testDoc = {
      _index: '',
      _id: '',
      _source: {
        'kibana.alert.suppression.docs_count': 5,
        'host.name': 'test-host',
      },
    };
    const filtered = filterSource(testDoc);
    expect(filtered).toEqual({
      'host.name': 'test-host',
    });
    expect(testDoc).toEqual({
      _index: '',
      _id: '',
      _source: {
        'kibana.alert.suppression.docs_count': 5,
        'host.name': 'test-host',
      },
    });
  });
});
