/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

import { decodeWithExcessOrThrow } from './runtime_types';

describe('runtime_types', () => {
  describe('decodeWithExcessOrThrow', () => {
    it('does not throw when all required fields are present for rt.type', () => {
      const schemaRt = rt.type({
        a: rt.string,
      });

      expect(() => decodeWithExcessOrThrow(schemaRt)({ a: 'hi' })).not.toThrow();
    });

    it('does not throw when all required fields are present for rt.strict', () => {
      const schemaRt = rt.strict({
        a: rt.string,
      });

      expect(() => decodeWithExcessOrThrow(schemaRt)({ a: 'hi' })).not.toThrow();
    });

    it('throws when a required field is not present for rt.type', () => {
      const schemaRt = rt.type({
        a: rt.string,
      });

      expect(() => decodeWithExcessOrThrow(schemaRt)({})).toThrowErrorMatchingInlineSnapshot(
        `"Invalid value \\"undefined\\" supplied to \\"a\\""`
      );
    });

    it('throws when a required field is not present for rt.strict', () => {
      const schemaRt = rt.strict({
        a: rt.string,
      });

      expect(() => decodeWithExcessOrThrow(schemaRt)({})).toThrowErrorMatchingInlineSnapshot(
        `"Invalid value \\"undefined\\" supplied to \\"a\\""`
      );
    });

    it('throws when an excess field exists for rt.strict', () => {
      const schemaRt = rt.strict({
        a: rt.string,
      });

      expect(() =>
        decodeWithExcessOrThrow(schemaRt)({ a: 'hi', b: 1 })
      ).toThrowErrorMatchingInlineSnapshot(`"invalid keys \\"b\\""`);
    });

    it('does not throw when an excess field exists for rt.type', () => {
      const schemaRt = rt.type({
        a: rt.string,
      });

      expect(() => decodeWithExcessOrThrow(schemaRt)({ a: 'hi', b: 1 })).not.toThrow();
    });

    it('throws when a nested excess field exists for rt.strict', () => {
      const schemaRt = rt.strict({
        a: rt.strict({
          b: rt.string,
        }),
      });

      expect(() =>
        decodeWithExcessOrThrow(schemaRt)({ a: { b: 'hi', c: 1 } })
      ).toThrowErrorMatchingInlineSnapshot(`"invalid keys \\"c\\""`);
    });

    it('does not throw when a nested excess field exists for rt.type', () => {
      const schemaRt = rt.type({
        a: rt.type({ b: rt.string }),
      });

      expect(() => decodeWithExcessOrThrow(schemaRt)({ a: { b: 'hi', c: 1 } })).not.toThrow();
    });

    it('returns the object after decoding for rt.type', () => {
      const schemaRt = rt.type({
        a: rt.string,
      });

      expect(decodeWithExcessOrThrow(schemaRt)({ a: 'hi' })).toStrictEqual({ a: 'hi' });
    });

    it('returns the object after decoding for rt.strict', () => {
      const schemaRt = rt.strict({
        a: rt.string,
      });

      expect(decodeWithExcessOrThrow(schemaRt)({ a: 'hi' })).toStrictEqual({ a: 'hi' });
    });
  });
});
