/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse, BasicPrettyPrinter } from '@kbn/esql-ast';
import { getTimespanLiteralsCorrections } from './timespan_literals';

describe('getTimespanLiteralsCorrections', () => {
  describe('with DATE_TRUNC', () => {
    it('replaces a timespan with a proper timespan literal', () => {
      const query = 'FROM logs | EVAL truncated = DATE_TRUNC("1 year", date)';
      const { root } = parse(query);

      const corrections = getTimespanLiteralsCorrections(root);
      corrections.forEach((correction) => correction.apply());

      const output = BasicPrettyPrinter.print(root);

      expect(output).toMatchInlineSnapshot(
        `"FROM logs | EVAL truncated = DATE_TRUNC(1 year, date)"`
      );
    });

    it('replaces a timespan without quantity', () => {
      const query = 'FROM logs | EVAL truncated = DATE_TRUNC("month", date)';
      const { root } = parse(query);

      const corrections = getTimespanLiteralsCorrections(root);
      corrections.forEach((correction) => correction.apply());

      const output = BasicPrettyPrinter.print(root);

      expect(output).toMatchInlineSnapshot(
        `"FROM logs | EVAL truncated = DATE_TRUNC(1 month, date)"`
      );
    });
  });

  describe('with BUCKET', () => {
    it('replaces a timespan with a proper timespan literal', () => {
      const query = 'FROM logs | STATS hires = COUNT(*) BY week = BUCKET(hire_date, "1 week")';
      const { root } = parse(query);

      const corrections = getTimespanLiteralsCorrections(root);
      corrections.forEach((correction) => correction.apply());

      const output = BasicPrettyPrinter.print(root);

      expect(output).toMatchInlineSnapshot(
        `"FROM logs | STATS hires = COUNT(*) BY week = BUCKET(hire_date, 1 week)"`
      );
    });

    it('replaces a timespan without quantity', () => {
      const query = 'FROM logs | STATS hires = COUNT(*) BY hour = BUCKET(hire_date, "hour")';
      const { root } = parse(query);

      const corrections = getTimespanLiteralsCorrections(root);
      corrections.forEach((correction) => correction.apply());

      const output = BasicPrettyPrinter.print(root);

      expect(output).toMatchInlineSnapshot(
        `"FROM logs | STATS hires = COUNT(*) BY hour = BUCKET(hire_date, 1 hour)"`
      );
    });
  });

  describe('with mixed usages', () => {
    it('find all occurrences in a complex query', () => {
      const query = `FROM logs
    | EVAL trunc_year = DATE_TRUNC("1 year", date)
    | EVAL trunc_month = DATE_TRUNC("month", date)
    | STATS hires = COUNT(*) BY hour = BUCKET(hire_date, "3 hour")`;
      const { root } = parse(query);

      const corrections = getTimespanLiteralsCorrections(root);
      corrections.forEach((correction) => correction.apply());

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
