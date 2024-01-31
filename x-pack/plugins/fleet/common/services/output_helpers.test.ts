/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { safeLoad } from 'js-yaml';

import {
  getAllowedOutputTypeForPolicy,
  outputYmlIncludesReservedPerformanceKey,
} from './output_helpers';

describe('getAllowedOutputTypeForPolicy', () => {
  it('should return all available output type for an agent policy without APM and Fleet Server', () => {
    const res = getAllowedOutputTypeForPolicy({
      package_policies: [
        {
          package: { name: 'nginx' },
        },
      ],
    } as any);

    expect(res).toContain('elasticsearch');
    expect(res).toContain('logstash');
  });

  it('should return only elasticsearch for an agent policy with APM', () => {
    const res = getAllowedOutputTypeForPolicy({
      package_policies: [
        {
          package: { name: 'apm' },
        },
      ],
    } as any);

    expect(res).toEqual(['elasticsearch']);
  });

  it('should return only elasticsearch for an agent policy with Fleet Server', () => {
    const res = getAllowedOutputTypeForPolicy({
      package_policies: [
        {
          package: { name: 'fleet_server' },
        },
      ],
    } as any);

    expect(res).toEqual(['elasticsearch']);
  });
});

describe('outputYmlIncludesReservedPerformanceKey', () => {
  describe('dot notation', () => {
    it('returns true when reserved key is present', () => {
      const configYml = `queue.mem.events: 1000`;

      expect(outputYmlIncludesReservedPerformanceKey(configYml, safeLoad)).toBe(true);
    });

    it('returns false when no reserved key is present', () => {
      const configYml = `some.random.key: 1000`;

      expect(outputYmlIncludesReservedPerformanceKey(configYml, safeLoad)).toBe(false);
    });
  });

  describe('object notation', () => {
    it('returns true when reserved key is present', () => {
      const configYml = `
      queue:
          mem:
            events: 1000
    `;

      expect(outputYmlIncludesReservedPerformanceKey(configYml, safeLoad)).toBe(true);
    });

    it('returns false when no reserved key is present', () => {
      const configYml = `
        some:
          random:
            key: 1000
      `;

      expect(outputYmlIncludesReservedPerformanceKey(configYml, safeLoad)).toBe(false);
    });
  });

  describe('plain string', () => {
    it('returns true when reserved key is present', () => {
      const configYml = `bulk_max_size`;

      expect(outputYmlIncludesReservedPerformanceKey(configYml, safeLoad)).toBe(true);
    });

    it('returns false when no reserved key is present', () => {
      const configYml = `just a string`;

      expect(outputYmlIncludesReservedPerformanceKey(configYml, safeLoad)).toBe(false);
    });
  });

  describe('comment', () => {
    it('returns false when reserved key is present only in a comment', () => {
      const configYml = `true`;

      expect(outputYmlIncludesReservedPerformanceKey(configYml, safeLoad)).toBe(false);
    });
  });

  describe('empty string', () => {
    it('returns false when YML is empty', () => {
      const configYml = ``;

      expect(outputYmlIncludesReservedPerformanceKey(configYml, safeLoad)).toBe(false);
    });
  });
});
