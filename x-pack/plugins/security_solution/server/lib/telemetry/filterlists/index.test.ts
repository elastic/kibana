/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { copyAllowlistedFields } from '.';

describe('Security Telemetry filters', () => {
  describe('allowlistEventFields', () => {
    const allowlist = {
      _id: true,
      a: true,
      b: true,
      c: {
        d: true,
      },
      'kibana.alert.ancestors': true,
      'kibana.alert.original_event.module': true,
    };

    it('filters top level', () => {
      const event = {
        _id: 'id',
        a: 'a',
        a1: 'a1',
        b: 'b',
        b1: 'b1',
      };
      expect(copyAllowlistedFields(allowlist, event)).toStrictEqual({
        _id: 'id',
        a: 'a',
        b: 'b',
      });
    });

    it('filters nested', () => {
      const event = {
        a: {
          a1: 'a1',
        },
        a1: 'a1',
        b: {
          b1: 'b1',
        },
        b1: 'b1',
        c: {
          d: 'd',
          e: 'e',
          f: 'f',
        },
      };
      expect(copyAllowlistedFields(allowlist, event)).toStrictEqual({
        a: {
          a1: 'a1',
        },
        b: {
          b1: 'b1',
        },
        c: {
          d: 'd',
        },
      });
    });

    it('filters arrays of objects', () => {
      const event = {
        a: [
          {
            a1: 'a1',
          },
        ],
        b: {
          b1: 'b1',
        },
        c: [
          {
            d: 'd1',
            e: 'e1',
            f: 'f1',
          },
          {
            d: 'd2',
            e: 'e2',
            f: 'f2',
          },
          {
            d: 'd3',
            e: 'e3',
            f: 'f3',
          },
        ],
      };
      expect(copyAllowlistedFields(allowlist, event)).toStrictEqual({
        a: [
          {
            a1: 'a1',
          },
        ],
        b: {
          b1: 'b1',
        },
        c: [
          {
            d: 'd1',
          },
          {
            d: 'd2',
          },
          {
            d: 'd3',
          },
        ],
      });
    });

    it("doesn't create empty objects", () => {
      const event = {
        a: 'a',
        b: 'b',
        c: {
          e: 'e',
        },
      };
      expect(copyAllowlistedFields(allowlist, event)).toStrictEqual({
        a: 'a',
        b: 'b',
      });
    });

    it("copies long nested strings that shouldn't be broken up on customer deployments", () => {
      const event = {
        'kibana.alert.ancestors': 'a',
        'kibana.alert.original_event.module': 'b',
        'kibana.random.long.alert.string': {
          info: 'data',
        },
      };
      expect(copyAllowlistedFields(allowlist, event)).toStrictEqual({
        'kibana.alert.ancestors': 'a',
        'kibana.alert.original_event.module': 'b',
      });
    });
  });
});
