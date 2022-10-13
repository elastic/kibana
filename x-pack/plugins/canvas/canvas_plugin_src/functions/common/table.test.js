/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { functionWrapper, fontStyle } from '@kbn/presentation-util-plugin/common/lib';
import { testTable } from './__fixtures__/test_tables';
import { table } from './table';

describe('table', () => {
  const fn = functionWrapper(table);

  it('returns a render as table', () => {
    const result = fn(testTable, {
      font: fontStyle,
      paginate: false,
      perPage: 2,
    });
    expect(result).toHaveProperty('type', 'render');
    expect(result).toHaveProperty('as', 'table');
  });

  describe('context', () => {
    it('sets the context as the datatable', () => {
      const result = fn(testTable).value;
      expect(result).toHaveProperty('datatable', testTable);
    });
  });

  describe('args', () => {
    describe('font', () => {
      it('sets the font style of the table', () => {
        const result = fn(testTable, { font: fontStyle }).value;
        expect(result).toHaveProperty('font', fontStyle);
      });

      it('defaults to a Canvas expression that calls the font function', () => {
        const result = fn(testTable).value;
        expect(result).toHaveProperty('font', '{font}'); // should evaluate to a font object and not a string
      });
    });

    describe('paginate', () => {
      it('sets whether or not to paginate the table', () => {
        let result = fn(testTable, { paginate: true }).value;
        expect(result).toHaveProperty('paginate', true);

        result = fn(testTable, { paginate: false }).value;
        expect(result).toHaveProperty('paginate', false);
      });

      it('defaults to true', () => {
        const result = fn(testTable).value;
        expect(result).toHaveProperty('paginate', true);
      });
    });

    describe('perPage', () => {
      it('sets how many rows display per page', () => {
        const result = fn(testTable, { perPage: 30 }).value;
        expect(result).toHaveProperty('perPage', 30);
      });

      it('defaults to 10', () => {
        const result = fn(testTable).value;
        expect(result).toHaveProperty('perPage', 10);
      });
    });

    describe('showHeader', () => {
      it('sets the showHeader property', () => {
        const result = fn(testTable, { showHeader: false }).value;
        expect(result).toHaveProperty('showHeader', false);
      });

      it('defaults to true', () => {
        const result = fn(testTable).value;
        expect(result).toHaveProperty('showHeader', true);
      });
    });
  });
});
