/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { spaceApplicationPrivilegesSerializer } from './space_application_privileges_serializer';

describe('#privilege', () => {
  describe('#serialize', () => {
    test(`prepends privilege with space_`, () => {
      const result = spaceApplicationPrivilegesSerializer.privilege.serialize('all');
      expect(result).toBe('space_all');
    });
  });

  describe('#deserialize', () => {
    test(`throws error if privilege doesn't start with space_`, () => {
      expect(
        () => spaceApplicationPrivilegesSerializer.privilege.deserialize('foo_space_all')
      ).toThrowErrorMatchingSnapshot();
    });

    test(`removes space_ from the start`, () => {
      const result = spaceApplicationPrivilegesSerializer.privilege.deserialize('space_all');
      expect(result).toBe('all');
    });
  });
});

describe('#resource', () => {
  describe('#serialize', () => {
    test(`prepends resource with space:`, () => {
      const result = spaceApplicationPrivilegesSerializer.resource.serialize('marketing');
      expect(result).toBe('space:marketing');
    });
  });

  describe('#deserialize', () => {
    test(`throws error if resource doesn't start with space:`, () => {
      expect(
        () => spaceApplicationPrivilegesSerializer.resource.deserialize('foo:space:something')
      ).toThrowErrorMatchingSnapshot();
    });

    test(`removes space: from the start`, () => {
      const result = spaceApplicationPrivilegesSerializer.resource.deserialize('space:marketing');
      expect(result).toBe('marketing');
    });
  });
});
