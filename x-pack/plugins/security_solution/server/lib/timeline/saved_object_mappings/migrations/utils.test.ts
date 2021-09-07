/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createReference } from './utils';

describe('migration utils', () => {
  describe('createReference', () => {
    it('returns an array with a reference when the id is defined', () => {
      expect(createReference('awesome', 'name', 'type')).toEqual([
        { id: 'awesome', name: 'name', type: 'type' },
      ]);
    });

    it('returns an empty array when the id is undefined', () => {
      expect(createReference(undefined, 'name', 'type')).toHaveLength(0);
    });

    it('returns an empty array when the id is null', () => {
      expect(createReference(null, 'name', 'type')).toHaveLength(0);
    });
  });
});
