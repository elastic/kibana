/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  addServiceToKuery,
  removeServiceFromKuery,
  getExpandedServiceNamesFromKuery,
  getBaseKuery,
} from './kuery_expand_helpers';

describe('kuery_expand_helpers', () => {
  describe('getBaseKuery', () => {
    it('returns empty string for empty or blank kuery', () => {
      expect(getBaseKuery('')).toBe('');
      expect(getBaseKuery('   ')).toBe('');
    });

    it('returns kuery unchanged when it has no service.name clauses', () => {
      expect(getBaseKuery('service.environment: prod')).toBe('service.environment: prod');
      expect(getBaseKuery('transaction.type: request')).toBe('transaction.type: request');
    });

    it('strips all service.name clauses', () => {
      expect(getBaseKuery('service.name: "frontend"')).toBe('');
      expect(getBaseKuery('service.environment: prod or service.name: "frontend"')).toBe(
        'service.environment: prod'
      );
      expect(
        getBaseKuery('service.environment: prod or service.name: "frontend" or service.name: "api"')
      ).toBe('service.environment: prod');
    });

    it('handles single-quoted service names', () => {
      expect(getBaseKuery("service.name: 'frontend' or env: prod")).toBe('env: prod');
    });
  });

  describe('getExpandedServiceNamesFromKuery', () => {
    it('returns empty array for empty or blank kuery', () => {
      expect(getExpandedServiceNamesFromKuery('')).toEqual([]);
      expect(getExpandedServiceNamesFromKuery('   ')).toEqual([]);
    });

    it('extracts service names from double-quoted clauses', () => {
      expect(getExpandedServiceNamesFromKuery('service.name: "frontend"')).toEqual(['frontend']);
      expect(
        getExpandedServiceNamesFromKuery('service.environment: prod or service.name: "api"')
      ).toEqual(['api']);
      expect(
        getExpandedServiceNamesFromKuery(
          'service.name: "frontend" or service.name: "api" or service.name: "db"'
        )
      ).toEqual(['frontend', 'api', 'db']);
    });

    it('extracts service names from single-quoted clauses', () => {
      expect(getExpandedServiceNamesFromKuery("service.name: 'frontend'")).toEqual(['frontend']);
    });

    it('deduplicates service names', () => {
      expect(getExpandedServiceNamesFromKuery('service.name: "a" or service.name: "a"')).toEqual([
        'a',
      ]);
    });
  });

  describe('addServiceToKuery', () => {
    it('returns only the service term when kuery is empty', () => {
      expect(addServiceToKuery('', 'frontend')).toBe('service.name: "frontend"');
      expect(addServiceToKuery('  ', 'api')).toBe('service.name: "api"');
    });

    it('appends with " or " when kuery has content', () => {
      expect(addServiceToKuery('service.environment: prod', 'frontend')).toBe(
        'service.environment: prod or service.name: "frontend"'
      );
      expect(addServiceToKuery('service.name: "a"', 'b')).toBe(
        'service.name: "a" or service.name: "b"'
      );
    });

    it('escapes double quotes in service name', () => {
      expect(addServiceToKuery('', 'foo"bar')).toBe('service.name: "foo\\"bar"');
    });
  });

  describe('removeServiceFromKuery', () => {
    it('returns empty string when kuery is empty', () => {
      expect(removeServiceFromKuery('', 'frontend')).toBe('');
    });

    it('removes the only clause when kuery is just service.name: "X"', () => {
      expect(removeServiceFromKuery('service.name: "frontend"', 'frontend')).toBe('');
      expect(removeServiceFromKuery("service.name: 'frontend'", 'frontend')).toBe('');
    });

    it('removes " or service.name: X" from the end', () => {
      expect(
        removeServiceFromKuery('service.environment: prod or service.name: "frontend"', 'frontend')
      ).toBe('service.environment: prod');
    });

    it('removes " or service.name: X" from the middle', () => {
      expect(
        removeServiceFromKuery('service.name: "a" or service.name: "b" or service.name: "c"', 'b')
      ).toBe('service.name: "a" or service.name: "c"');
    });

    it('removes "service.name: X or " from the start', () => {
      expect(
        removeServiceFromKuery('service.name: "frontend" or service.environment: prod', 'frontend')
      ).toBe('service.environment: prod');
    });

    it('is case-insensitive for the pattern', () => {
      expect(removeServiceFromKuery('SERVICE.NAME: "frontend" or x: 1', 'frontend')).toBe('x: 1');
    });
  });
});
