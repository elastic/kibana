/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  isIPv4,
  getIPFromBucket,
  InfraSnapshotNodeGroupByBucket,
  getMetricValueFromBucket,
  InfraSnapshotMetricsBucket,
} from './response_helpers';

describe('InfraOps ResponseHelpers', () => {
  describe('isIPv4', () => {
    it('should return true for IPv4', () => {
      expect(isIPv4('192.168.2.4')).toBe(true);
    });
    it('should return false for anything else', () => {
      expect(isIPv4('0:0:0:0:0:0:0:1')).toBe(false);
    });
  });

  describe('getIPFromBucket', () => {
    it('should return IPv4 address', () => {
      const bucket: InfraSnapshotNodeGroupByBucket = {
        key: {
          id: 'example-01',
          name: 'example-01',
        },
        ip: {
          hits: {
            total: { value: 1 },
            hits: [
              {
                _index: 'metricbeat-2019-01-01',
                _type: '_doc',
                _id: '29392939',
                _score: null,
                sort: [],
                _source: {
                  host: {
                    ip: ['2001:db8:85a3::8a2e:370:7334', '192.168.1.4'],
                  },
                },
              },
            ],
          },
        },
      };
      expect(getIPFromBucket('host', bucket)).toBe('192.168.1.4');
    });
    it('should NOT return ipv6 address', () => {
      const bucket: InfraSnapshotNodeGroupByBucket = {
        key: {
          id: 'example-01',
          name: 'example-01',
        },
        ip: {
          hits: {
            total: { value: 1 },
            hits: [
              {
                _index: 'metricbeat-2019-01-01',
                _type: '_doc',
                _id: '29392939',
                _score: null,
                sort: [],
                _source: {
                  host: {
                    ip: ['2001:db8:85a3::8a2e:370:7334'],
                  },
                },
              },
            ],
          },
        },
      };
      expect(getIPFromBucket('host', bucket)).toBe(null);
    });
  });

  describe('getMetricValueFromBucket', () => {
    it('should return the value of a bucket with data', () => {
      expect(getMetricValueFromBucket('custom', testBucket, 1)).toBe(0.5);
    });
    it('should return the normalized value of a bucket with data', () => {
      expect(getMetricValueFromBucket('cpu', testNormalizedBucket, 1)).toBe(50);
    });
    it('should return null for a bucket with no data', () => {
      expect(getMetricValueFromBucket('custom', testEmptyBucket, 1)).toBe(null);
    });
  });
});

// Hack to get around TypeScript
const buckets = [
  {
    key: 'a',
    doc_count: 1,
    custom_1: {
      value: 0.5,
    },
  },
  {
    key: 'b',
    doc_count: 1,
    cpu: {
      value: 0.5,
      normalized_value: 50,
    },
  },
  {
    key: 'c',
    doc_count: 0,
  },
] as InfraSnapshotMetricsBucket[];
const [testBucket, testNormalizedBucket, testEmptyBucket] = buckets;
