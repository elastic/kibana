/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse, BasicPrettyPrinter } from '@kbn/esql-ast';
import { applyTimespanLiteralsCorrections } from './timespan_literals';

describe('getTimespanLiteralsCorrections', () => {
  describe('with DATE_TRUNC', () => {
    it('replaces a timespan with a proper timespan literal', () => {
      const query = 'FROM logs | EVAL truncated = DATE_TRUNC("1 year", date)';
      const { root } = parse(query);

      applyTimespanLiteralsCorrections(root);

      const output = BasicPrettyPrinter.print(root);

      expect(output).toMatchInlineSnapshot(
        `"FROM logs | EVAL truncated = DATE_TRUNC(1 year, date)"`
      );
    });

    it('replaces a timespan without quantity', () => {
      const query = 'FROM logs | EVAL truncated = DATE_TRUNC("month", date)';
      const { root } = parse(query);

      applyTimespanLiteralsCorrections(root);

      const output = BasicPrettyPrinter.print(root);

      expect(output).toMatchInlineSnapshot(
        `"FROM logs | EVAL truncated = DATE_TRUNC(1 month, date)"`
      );
    });

    it('replaces uppercase literals', () => {
      const query = 'FROM logs | EVAL truncated = DATE_TRUNC("1 YEAR", date)';
      const { root } = parse(query);

      applyTimespanLiteralsCorrections(root);

      const output = BasicPrettyPrinter.print(root);

      expect(output).toMatchInlineSnapshot(
        `"FROM logs | EVAL truncated = DATE_TRUNC(1 year, date)"`
      );
    });

    it('returns info about the correction', () => {
      const query = 'FROM logs | EVAL truncated = DATE_TRUNC("1 year", date)';
      const { root } = parse(query);

      const corrections = applyTimespanLiteralsCorrections(root);

      expect(corrections).toHaveLength(1);
      expect(corrections[0]).toEqual({
        type: 'string_as_timespan_literal',
        description:
          'Replaced string literal with timespan literal in DATE_TRUNC function at position 29',
        node: expect.any(Object),
      });
    });
  });

  describe('with BUCKET', () => {
    it('replaces a timespan with a proper timespan literal', () => {
      const query = 'FROM logs | STATS hires = COUNT(*) BY week = BUCKET(hire_date, "1 week")';
      const { root } = parse(query);

      applyTimespanLiteralsCorrections(root);

      const output = BasicPrettyPrinter.print(root);

      expect(output).toMatchInlineSnapshot(
        `"FROM logs | STATS hires = COUNT(*) BY week = BUCKET(hire_date, 1 week)"`
      );
    });

    it('replaces a timespan without quantity', () => {
      const query = 'FROM logs | STATS hires = COUNT(*) BY hour = BUCKET(hire_date, "hour")';
      const { root } = parse(query);

      applyTimespanLiteralsCorrections(root);

      const output = BasicPrettyPrinter.print(root);

      expect(output).toMatchInlineSnapshot(
        `"FROM logs | STATS hires = COUNT(*) BY hour = BUCKET(hire_date, 1 hour)"`
      );
    });

    it('replaces uppercase literals', () => {
      const query = 'FROM logs | STATS hires = COUNT(*) BY week = BUCKET(hire_date, "1 WEEK")';
      const { root } = parse(query);

      applyTimespanLiteralsCorrections(root);

      const output = BasicPrettyPrinter.print(root);

      expect(output).toMatchInlineSnapshot(
        `"FROM logs | STATS hires = COUNT(*) BY week = BUCKET(hire_date, 1 week)"`
      );
    });

    it('returns info about the correction', () => {
      const query = 'FROM logs | STATS hires = COUNT(*) BY hour = BUCKET(hire_date, "hour")';
      const { root } = parse(query);

      const corrections = applyTimespanLiteralsCorrections(root);

      expect(corrections).toHaveLength(1);
      expect(corrections[0]).toEqual({
        type: 'string_as_timespan_literal',
        description:
          'Replaced string literal with timespan literal in BUCKET function at position 45',
        node: expect.any(Object),
      });
    });
  });

  describe('with mixed usages', () => {
    it('find all occurrences in a complex query', () => {
      const query = `FROM logs
    | EVAL trunc_year = DATE_TRUNC("1 year", date)
    | EVAL trunc_month = DATE_TRUNC("month", date)
    | STATS hires = COUNT(*) BY hour = BUCKET(hire_date, "3 hour")`;
      const { root } = parse(query);

      applyTimespanLiteralsCorrections(root);

      const output = BasicPrettyPrinter.print(root, { multiline: true, pipeTab: '' });

      expect(output).toMatchInlineSnapshot(`
      "FROM logs
      | EVAL trunc_year = DATE_TRUNC(1 year, date)
      | EVAL trunc_month = DATE_TRUNC(1 month, date)
      | STATS hires = COUNT(*) BY hour = BUCKET(hire_date, 3 hour)"
    `);
    });
  });
});
