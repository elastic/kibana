/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ResourceSerializer } from './resource_serializer';

describe('#serializeSpaceResource', () => {
  test('returns `space:${spaceId}`', () => {
    expect(ResourceSerializer.serializeSpaceResource('foo-space')).toBe('space:foo-space');
  });
});

describe('#deserializeSpaceResource', () => {
  test(`throws error if resource doesn't start with space:`, () => {
    expect(() => {
      ResourceSerializer.deserializeSpaceResource('foo-space');
    }).toThrowErrorMatchingSnapshot();
  });

  test(`returns spaceId without the space: prefix`, () => {
    expect(ResourceSerializer.deserializeSpaceResource(`space:foo-space`)).toBe('foo-space');
  });
});
