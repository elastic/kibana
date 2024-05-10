/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CasesConnectorRunParamsSchema } from './schema';

describe('CasesConnectorRunParamsSchema', () => {
  const getParams = (overrides = {}) => ({
    alerts: [{ _id: 'alert-id', _index: 'alert-index' }],
    groupingBy: ['host.name'],
    rule: { id: 'rule-id', name: 'Test rule', tags: [], ruleUrl: 'https://example.com' },
    owner: 'cases',
    ...overrides,
  });

  it('accepts valid params', () => {
    expect(CasesConnectorRunParamsSchema.validate(getParams())).toMatchInlineSnapshot(`
      Object {
        "alerts": Array [
          Object {
            "_id": "alert-id",
            "_index": "alert-index",
          },
        ],
        "groupingBy": Array [
          "host.name",
        ],
        "maximumCasesToOpen": 5,
        "owner": "cases",
        "reopenClosedCases": false,
        "rule": Object {
          "id": "rule-id",
          "name": "Test rule",
          "ruleUrl": "https://example.com",
          "tags": Array [],
        },
        "timeWindow": "7d",
      }
    `);
  });

  describe('alerts', () => {
    it('throws if the alerts do not contain _id and _index', () => {
      expect(() =>
        CasesConnectorRunParamsSchema.validate(getParams({ alerts: [{ foo: 'bar' }] }))
      ).toThrow();
    });
  });

  describe('groupingBy', () => {
    it('accept an empty groupingBy array', () => {
      expect(() =>
        CasesConnectorRunParamsSchema.validate(getParams({ groupingBy: [] }))
      ).not.toThrow();
    });

    it('does not accept more than one groupingBy key', () => {
      expect(() =>
        CasesConnectorRunParamsSchema.validate(
          getParams({ groupingBy: ['host.name', 'source.ip'] })
        )
      ).toThrow();
    });
  });

  describe('rule', () => {
    it('accept empty tags', () => {
      const params = getParams();

      expect(() =>
        CasesConnectorRunParamsSchema.validate({ ...params, rule: { ...params.rule, tags: [] } })
      ).not.toThrow();
    });

    it('does not accept an empty tag', () => {
      const params = getParams();

      expect(() =>
        CasesConnectorRunParamsSchema.validate({
          ...params,
          rule: { ...params.rule, tags: '' },
        })
      ).toThrow();
    });
  });

  describe('timeWindow', () => {
    it('throws if the first digit starts with zero', () => {
      expect(() =>
        CasesConnectorRunParamsSchema.validate(getParams({ timeWindow: '0d' }))
      ).toThrow();
    });

    it('throws if the timeWindow does not start with a number', () => {
      expect(() =>
        CasesConnectorRunParamsSchema.validate(getParams({ timeWindow: 'd1' }))
      ).toThrow();
    });

    it('should fail for valid date math but not valid time window', () => {
      expect(() =>
        CasesConnectorRunParamsSchema.validate(getParams({ timeWindow: '10d+3d' }))
      ).toThrow();
    });

    it('throws if there is a non valid letter at the end', () => {
      expect(() =>
        CasesConnectorRunParamsSchema.validate(getParams({ timeWindow: '10d#' }))
      ).toThrow();
    });

    it('throws if there is a valid letter at the end', () => {
      expect(() =>
        CasesConnectorRunParamsSchema.validate(getParams({ timeWindow: '10dd' }))
      ).toThrow();
    });

    it('throws if there is a digit at the end', () => {
      expect(() =>
        CasesConnectorRunParamsSchema.validate(getParams({ timeWindow: '10d2' }))
      ).toThrow();
    });

    it('throws if there are two valid formats in sequence', () => {
      expect(() =>
        CasesConnectorRunParamsSchema.validate(getParams({ timeWindow: '1d2d' }))
      ).toThrow();
    });

    it('accepts double digit numbers', () => {
      expect(() =>
        CasesConnectorRunParamsSchema.validate(getParams({ timeWindow: '10d' }))
      ).not.toThrow();
    });

    it.each(['s', 'm', 'H', 'h', 'M', 'y'])('does not allow time unit %s', (unit) => {
      expect(() =>
        CasesConnectorRunParamsSchema.validate(getParams({ timeWindow: `5${unit}` }))
      ).toThrow();
    });

    it.each(['d', 'w'])('allows time unit %s', (unit) => {
      expect(() =>
        CasesConnectorRunParamsSchema.validate(getParams({ timeWindow: `5${unit}` }))
      ).not.toThrow();
    });

    it('defaults the timeWindow to 7d', () => {
      expect(CasesConnectorRunParamsSchema.validate(getParams()).timeWindow).toBe('7d');
    });
  });

  describe('reopenClosedCases', () => {
    it('defaults the reopenClosedCases to false', () => {
      expect(CasesConnectorRunParamsSchema.validate(getParams()).reopenClosedCases).toBe(false);
    });
  });

  describe('maximumCasesToOpen', () => {
    it('defaults the maximumCasesToOpen to 5', () => {
      expect(CasesConnectorRunParamsSchema.validate(getParams()).maximumCasesToOpen).toBe(5);
    });

    it('sets the maximumCasesToOpen correctly', () => {
      expect(
        CasesConnectorRunParamsSchema.validate(getParams({ maximumCasesToOpen: 3 }))
          .maximumCasesToOpen
      ).toBe(3);
    });

    it('does not accept maximumCasesToOpen to be zero', () => {
      const params = getParams();

      expect(() =>
        CasesConnectorRunParamsSchema.validate({
          ...params,
          maximumCasesToOpen: 0,
        })
      ).toThrow();
    });

    it('does not accept maximumCasesToOpen to be more than 10', () => {
      const params = getParams();

      expect(() =>
        CasesConnectorRunParamsSchema.validate({
          ...params,
          maximumCasesToOpen: 11,
        })
      ).toThrow();
    });
  });
});
