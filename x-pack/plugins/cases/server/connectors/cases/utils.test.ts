/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sortGroupDefinition } from './util';

describe('utils', () => {
  describe('sortGroupDefinition', () => {
    it('sorts a group definition correctly', async () => {
      const groupingDefinition =
        'source.nat.ip=0.1.2.0&host.name=A&host.ip=0.0.0.1&agent.id=8a4f500d';

      expect(sortGroupDefinition(groupingDefinition)).toBe(
        'agent.id=8a4f500d&host.ip=0.0.0.1&host.name=A&source.nat.ip=0.1.2.0'
      );
    });

    it('returns the grouping definition if there is only one field', async () => {
      const groupingDefinition = 'host.name=A';

      expect(sortGroupDefinition(groupingDefinition)).toBe('host.name=A');
    });

    it('returns an empty string if the grouping definition is an empty string', async () => {
      const groupingDefinition = '';

      expect(sortGroupDefinition(groupingDefinition)).toBe('');
    });
  });
});
