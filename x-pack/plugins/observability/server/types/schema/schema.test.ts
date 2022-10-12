/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { fold } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';

import { dateTimeType } from './common';
import { Duration, DurationUnit } from './duration';

describe('Schema', () => {
  describe('DateTime', () => {
    it('encodes', () => {
      expect(dateTimeType.encode('2022-06-01T08:00')).toEqual('2022-06-01T08:00');
    });

    it('decodes', () => {
      expect(
        pipe(
          dateTimeType.decode('2022-06-01T08:00'),
          fold((e) => {
            throw new Error('irrelevant');
          }, t.identity)
        )
      ).toEqual('2022-06-01T08:00');
    });

    it('fails decoding when seconds are provided', () => {
      expect(() =>
        pipe(
          dateTimeType.decode('2022-06-01T08:00:23'),
          fold((e) => {
            throw new Error('decode');
          }, t.identity)
        )
      ).toThrow(new Error('decode'));
    });

    it('fails decoding when offset are provided', () => {
      expect(() =>
        pipe(
          dateTimeType.decode('2022-06-01T08:00+03:00'),
          fold((e) => {
            throw new Error('decode');
          }, t.identity)
        )
      ).toThrow(new Error('decode'));
    });
  });

  describe('Duration', () => {
    it('throws when value is negative', () => {
      expect(() => new Duration(-1, DurationUnit.d)).toThrow('invalid duration value');
    });

    it('throws when value is zero', () => {
      expect(() => new Duration(0, DurationUnit.d)).toThrow('invalid duration value');
    });

    it('throws when unit is not valid', () => {
      expect(() => new Duration(1, 'z' as DurationUnit)).toThrow('invalid duration unit');
    });
  });
});
