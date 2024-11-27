/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RiskScoreWeight } from '.';
import type { SafeParseError, SafeParseSuccess } from '@kbn/zod';
import { stringifyZodError } from '@kbn/zod-helpers';
import { RiskCategories, RiskWeightTypes } from '../../../entity_analytics/risk_engine';

describe('risk weight schema', () => {
  let type: string;

  describe('allowed types', () => {
    it('allows the global weight type', () => {
      const payload = {
        type: RiskWeightTypes.global,
        host: 0.1,
      };
      const decoded = RiskScoreWeight.safeParse(payload) as SafeParseSuccess<object>;

      expect(decoded.success).toBeTruthy();
      expect(decoded.data).toEqual(payload);
    });

    it('allows the risk category weight type', () => {
      const payload = {
        type: RiskWeightTypes.global,
        host: 0.1,
      };
      const decoded = RiskScoreWeight.safeParse(payload) as SafeParseSuccess<object>;

      expect(decoded.success).toBeTruthy();
      expect(decoded.data).toEqual(payload);
    });

    it('rejects an unknown weight type', () => {
      const payload = {
        type: 'unknown',
        host: 0.1,
      };
      const decoded = RiskScoreWeight.safeParse(payload) as SafeParseError<object>;

      expect(decoded.success).toBeFalsy();
      expect(decoded.error.errors.length).toBeGreaterThan(0);
    });
  });

  describe('conditional fields', () => {
    describe('global weights', () => {
      beforeEach(() => {
        type = RiskWeightTypes.global;
      });

      it('rejects if neither host nor user weight are specified', () => {
        const payload = { type };
        const decoded = RiskScoreWeight.safeParse(payload) as SafeParseError<object>;

        expect(decoded.success).toBeFalsy();
        expect(stringifyZodError(decoded.error)).toContain('host: Required, user: Required');
      });

      it('allows a single host weight', () => {
        const payload = { type, host: 0.1 };
        const decoded = RiskScoreWeight.safeParse(payload) as SafeParseSuccess<object>;

        expect(decoded.success).toBeTruthy();
        expect(decoded.data).toEqual(payload);
      });

      it('allows a single user weight', () => {
        const payload = { type, user: 0.1 };
        const decoded = RiskScoreWeight.safeParse(payload) as SafeParseSuccess<object>;

        expect(decoded.success).toBeTruthy();
        expect(decoded.data).toEqual(payload);
      });

      it('allows both a host and user weight', () => {
        const payload = { type, host: 0.1, user: 0.5 };
        const decoded = RiskScoreWeight.safeParse(payload) as SafeParseSuccess<object>;

        expect(decoded.success).toBeTruthy();
        expect(decoded.data).toEqual({ type, host: 0.1, user: 0.5 });
      });

      it('rejects a weight outside of 0-1', () => {
        const payload = { type, user: 55 };
        const decoded = RiskScoreWeight.safeParse(payload) as SafeParseError<object>;

        expect(decoded.success).toBeFalsy();
        expect(stringifyZodError(decoded.error)).toContain(
          `user: Number must be less than or equal to 1`
        );
      });

      it('removes extra keys if specified', () => {
        const payload = {
          type,
          host: 0.1,
          value: 'superfluous',
          extra: 'even more',
        };
        const decoded = RiskScoreWeight.safeParse(payload) as SafeParseSuccess<object>;

        expect(decoded.success).toBeTruthy();
        expect(decoded.data).toEqual({ type, host: 0.1 });
      });
    });

    describe('risk category weights', () => {
      beforeEach(() => {
        type = RiskWeightTypes.riskCategory;
      });

      it('requires a value', () => {
        const payload = { type, user: 0.1 };
        const decoded = RiskScoreWeight.safeParse(payload) as SafeParseError<object>;

        expect(decoded.success).toBeFalsy();
        expect(stringifyZodError(decoded.error)).toEqual(
          'type: Invalid literal value, expected "global_identifier", host: Required, type: Invalid literal value, expected "global_identifier"'
        );
      });

      it('rejects a weight outside of 0-1', () => {
        const payload = { type, value: RiskCategories.category_1, host: -5 };
        const decoded = RiskScoreWeight.safeParse(payload) as SafeParseError<object>;

        expect(decoded.success).toBeFalsy();
        expect(stringifyZodError(decoded.error)).toContain(
          `host: Number must be greater than or equal to 0`
        );
      });
    });
  });
});
