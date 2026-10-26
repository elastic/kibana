/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getWorstSloStatus } from './get_services_slo_stats';

describe('get_services_slo_stats', () => {
  describe('getWorstSloStatus', () => {
    it('returns violated when there are violated SLOs', () => {
      expect(getWorstSloStatus({ violated: 2, degrading: 1, noData: 0, healthy: 5 })).toEqual({
        sloStatus: 'violated',
        sloCount: 2,
      });
    });

    it('returns degrading when no violated but degrading exists', () => {
      expect(getWorstSloStatus({ violated: 0, degrading: 3, noData: 0, healthy: 5 })).toEqual({
        sloStatus: 'degrading',
        sloCount: 3,
      });
    });

    it('returns noData when only noData and healthy exist', () => {
      expect(getWorstSloStatus({ violated: 0, degrading: 0, noData: 2, healthy: 5 })).toEqual({
        sloStatus: 'noData',
        sloCount: 2,
      });
    });

    it('returns healthy when all SLOs are healthy', () => {
      expect(getWorstSloStatus({ violated: 0, degrading: 0, noData: 0, healthy: 10 })).toEqual({
        sloStatus: 'healthy',
        sloCount: 10,
      });
    });

    it('returns healthy with count 0 when no SLOs exist', () => {
      expect(getWorstSloStatus({ violated: 0, degrading: 0, noData: 0, healthy: 0 })).toEqual({
        sloStatus: 'healthy',
        sloCount: 0,
      });
    });

    it('prioritizes violated over all other statuses', () => {
      expect(getWorstSloStatus({ violated: 1, degrading: 10, noData: 5, healthy: 100 })).toEqual({
        sloStatus: 'violated',
        sloCount: 1,
      });
    });

    it('prioritizes degrading over noData and healthy', () => {
      expect(getWorstSloStatus({ violated: 0, degrading: 1, noData: 10, healthy: 100 })).toEqual({
        sloStatus: 'degrading',
        sloCount: 1,
      });
    });

    it('prioritizes noData over healthy', () => {
      expect(getWorstSloStatus({ violated: 0, degrading: 0, noData: 1, healthy: 100 })).toEqual({
        sloStatus: 'noData',
        sloCount: 1,
      });
    });
  });
});
