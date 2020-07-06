/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mockFields } from './field.mock';
import { getFields } from './fields';

describe('the ConfigurationSourcesAdapter', () => {
  test('adds the default source when no sources are configured', async () => {
    const expectedData = [
      'totalCount',
      'edges.host._id',
      'edges.host.name',
      'edges.host.os',
      'edges.host.version',
      'edges.host.firstSeen',
      'edges.cursor.value',
      'pageInfo.endCursor.value',
      'pageInfo.hasNextPage',
    ];

    expect(getFields(mockFields)).toEqual(expectedData);
  });
});
