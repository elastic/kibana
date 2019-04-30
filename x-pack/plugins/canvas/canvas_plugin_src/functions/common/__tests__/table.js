/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { table } from '../table';
import { functionWrapper } from '../../../../__tests__/helpers/function_wrapper';
import { testTable } from './fixtures/test_tables';
import { fontStyle } from './fixtures/test_styles';

describe('table', () => {
  const fn = functionWrapper(table);

  it('returns a render as table', () => {
    const result = fn(testTable, {
      font: fontStyle,
      paginate: false,
      perPage: 2,
    });
    expect(result)
      .to.have.property('type', 'render')
      .and.to.have.property('as', 'table');
  });

  describe('context', () => {
    it('sets the context as the datatable', () => {
      const result = fn(testTable).value;
      expect(result).to.have.property('datatable', testTable);
    });
  });

  describe('args', () => {
    describe('font', () => {
      it('sets the font style of the table', () => {
        const result = fn(testTable, { font: fontStyle }).value;
        expect(result).to.have.property('font', fontStyle);
      });

      it('defaults to a Canvas expression that calls the font function', () => {
        const result = fn(testTable).value;
        expect(result).to.have.property('font', '{font}'); // should evaluate to a font object and not a string
      });
    });

    describe('paginate', () => {
      it('sets whether or not to paginate the table', () => {
        let result = fn(testTable, { paginate: true }).value;
        expect(result).to.have.property('paginate', true);

        result = fn(testTable, { paginate: false }).value;
        expect(result).to.have.property('paginate', false);
      });

      it('defaults to true', () => {
        const result = fn(testTable).value;
        expect(result).to.have.property('paginate', true);
      });
    });

    describe('perPage', () => {
      it('sets how many rows display per page', () => {
        const result = fn(testTable, { perPage: 30 }).value;
        expect(result).to.have.property('perPage', 30);
      });

      it('defaults to 10', () => {
        const result = fn(testTable).value;
        expect(result).to.have.property('perPage', 10);
      });
    });

    describe('showHeader', () => {
      it('sets the showHeader property', () => {
        const result = fn(testTable, { showHeader: false }).value;
        expect(result).to.have.property('showHeader', false);
      });

      it('defaults to true', () => {
        const result = fn(testTable).value;
        expect(result).to.have.property('showHeader', true);
      });
    });
  });
});
