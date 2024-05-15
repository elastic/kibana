/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';
import { foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';

import { riskWeightSchema } from './schema';
import { RiskWeightTypes } from './types';

describe('risk weight schema', () => {
  let type: string;

  describe('allowed types', () => {
    it('allows the global weight type', () => {
      const payload = {
        type: RiskWeightTypes.global,
        host: 0.1,
      };
      const decoded = riskWeightSchema.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    it('allows the risk category weight type', () => {
      const payload = {
        type: RiskWeightTypes.global,
        host: 0.1,
      };
      const decoded = riskWeightSchema.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    it('rejects an unknown weight type', () => {
      const payload = {
        type: 'unknown',
        host: 0.1,
      };
      const decoded = riskWeightSchema.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors)).length).toBeGreaterThan(0);
      expect(message.schema).toEqual({});
    });
  });

  describe('conditional fields', () => {
    describe('global weights', () => {
      beforeEach(() => {
        type = RiskWeightTypes.global;
      });

      it('rejects if neither host nor user weight are specified', () => {
        const payload = { type };
        const decoded = riskWeightSchema.decode(payload);
        const message = pipe(decoded, foldLeftRight);

        expect(getPaths(left(message.errors))).toEqual([
          'Invalid value "undefined" supplied to "host"',
          'Invalid value "undefined" supplied to "user"',
        ]);
        expect(message.schema).toEqual({});
      });

      it('allows a single host weight', () => {
        const payload = { type, host: 0.1 };
        const decoded = riskWeightSchema.decode(payload);
        const message = pipe(decoded, foldLeftRight);

        expect(getPaths(left(message.errors))).toEqual([]);
        expect(message.schema).toEqual(payload);
      });

      it('allows a single user weight', () => {
        const payload = { type, user: 0.1 };
        const decoded = riskWeightSchema.decode(payload);
        const message = pipe(decoded, foldLeftRight);

        expect(getPaths(left(message.errors))).toEqual([]);
        expect(message.schema).toEqual(payload);
      });

      it('allows both a host and user weight', () => {
        const payload = { type, host: 0.1, user: 0.5 };
        const decoded = riskWeightSchema.decode(payload);
        const message = pipe(decoded, foldLeftRight);

        expect(getPaths(left(message.errors))).toEqual([]);
        expect(message.schema).toEqual({ type, host: 0.1, user: 0.5 });
      });

      it('rejects a weight outside of 0-1', () => {
        const payload = { type, user: 55 };
        const decoded = riskWeightSchema.decode(payload);
        const message = pipe(decoded, foldLeftRight);

        expect(getPaths(left(message.errors))).toContain('Invalid value "55" supplied to "user"');
        expect(message.schema).toEqual({});
      });

      it('removes extra keys if specified', () => {
        const payload = {
          type,
          host: 0.1,
          value: 'superfluous',
          extra: 'even more',
        };
        const decoded = riskWeightSchema.decode(payload);
        const message = pipe(decoded, foldLeftRight);

        expect(getPaths(left(message.errors))).toEqual([]);
        expect(message.schema).toEqual({ type, host: 0.1 });
      });
    });
  });
});
