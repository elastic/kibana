/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rowToDocument } from './row_to_document';

describe('rowToDocument', () => {
  it('should convert row to document', () => {
    const columns = [
      { name: '_id', type: 'keyword' as const },
      { name: 'agent.name', type: 'keyword' as const },
      { name: 'agent.version', type: 'keyword' as const },
      { name: 'agent.type', type: 'keyword' as const },
    ];

    const row = ['abcd', null, '8.8.1', 'packetbeat'];
    expect(rowToDocument(columns, row)).toEqual({
      _id: 'abcd',
      'agent.version': '8.8.1',
      'agent.type': 'packetbeat',
    });
  });
});
