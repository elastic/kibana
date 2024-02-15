/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getGroupQueries, getGroupFilters, getGroups } from './get_group';

describe('getGroup', () => {
  describe('getGroupQueries', () => {
    it('should generate correct query with default field name', () => {
      const groups = [
        { field: 'container.id', value: 'container-0' },
        { field: 'host.name', value: 'host-0' },
      ];

      expect(getGroupQueries(groups)).toEqual([
        { match_phrase: { 'container.id': 'container-0' } },
        { match_phrase: { 'host.name': 'host-0' } },
      ]);
    });

    it('should generate correct query with custom field name', () => {
      const groups = [
        { field: 'container.id', value: 'container-0' },
        { field: 'host.name', value: 'host-0' },
      ];
      const fieldName = 'custom.field';

      expect(getGroupQueries(groups, fieldName)).toEqual([
        { match_phrase: { 'custom.field': 'container-0' } },
        { match_phrase: { 'custom.field': 'host-0' } },
      ]);
    });

    it('should return empty array when groups is empty', () => {
      const groups = undefined;

      expect(getGroupQueries(groups)).toEqual([]);
    });
  });

  describe('getGroupFilters', () => {
    it('should generate correct filter with default field name', () => {
      const groups = [
        { field: 'container.id', value: 'container-0' },
        { field: 'host.name', value: 'host-0' },
      ];

      expect(getGroupFilters(groups)).toEqual([
        {
          meta: {},
          query: { match_phrase: { 'container.id': 'container-0' } },
        },
        {
          meta: {},
          query: { match_phrase: { 'host.name': 'host-0' } },
        },
      ]);
    });

    it('should generate correct filter with custom field name', () => {
      const groups = [
        { field: 'container.id', value: 'container-0' },
        { field: 'host.name', value: 'host-0' },
      ];
      const fieldName = 'custom.field';

      expect(getGroupFilters(groups, fieldName)).toEqual([
        {
          meta: {},
          query: { match_phrase: { 'custom.field': 'container-0' } },
        },
        {
          meta: {},
          query: { match_phrase: { 'custom.field': 'host-0' } },
        },
      ]);
    });

    it('should return empty array when groups is empty', () => {
      const groups = undefined;

      expect(getGroupFilters(groups)).toEqual([]);
    });
  });

  describe('getGroups', () => {
    it('should generate correct filter with default field name', () => {
      const fields = ['container.id', 'host.name'];
      const values = ['container-0', 'host-0'];
      const groups = [
        { field: 'container.id', value: 'container-0' },
        { field: 'host.name', value: 'host-0' },
      ];

      expect(getGroups(fields, values)).toEqual(groups);
    });

    it('should return empty array if fields and values are empty', () => {
      expect(getGroups([], [])).toEqual([]);
    });
  });
});
