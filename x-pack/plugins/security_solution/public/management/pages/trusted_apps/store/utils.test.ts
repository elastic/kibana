/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseQueryFilterToKQL } from './utils';

describe('utils', () => {
  describe('parseQueryFilterToKQL', () => {
    it('should parse simple query without term', () => {
      expect(parseQueryFilterToKQL('')).toBe('');
    });
    it('should parse simple query with term', () => {
      expect(parseQueryFilterToKQL('simpleQuery')).toBe(
        'exception-list-agnostic.attributes.name:*simpleQuery* OR exception-list-agnostic.attributes.description:*simpleQuery* OR exception-list-agnostic.attributes.entries.value:*simpleQuery* OR exception-list-agnostic.attributes.entries.entries.value:*simpleQuery*'
      );
    });
    it('should parse complex query with term', () => {
      expect(parseQueryFilterToKQL('complex query')).toBe(
        'exception-list-agnostic.attributes.name:*complex*query* OR exception-list-agnostic.attributes.description:*complex*query* OR exception-list-agnostic.attributes.entries.value:*complex*query* OR exception-list-agnostic.attributes.entries.entries.value:*complex*query*'
      );
    });
    it('should parse complex query with special chars term', () => {
      expect(parseQueryFilterToKQL('C:\\tmpes')).toBe(
        'exception-list-agnostic.attributes.name:*C\\:\\\\tmpes* OR exception-list-agnostic.attributes.description:*C\\:\\\\tmpes* OR exception-list-agnostic.attributes.entries.value:*C\\:\\\\tmpes* OR exception-list-agnostic.attributes.entries.entries.value:*C\\:\\\\tmpes*'
      );
    });
  });
});
