/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { mapColumn } from '../mapColumn';
import { functionWrapper } from '../../../../__tests__/helpers/function_wrapper';
import { testTable, emptyTable } from './fixtures/test_tables';

const pricePlusTwo = datatable => Promise.resolve(datatable.rows[0].price + 2);

describe('mapColumn', () => {
  const fn = functionWrapper(mapColumn);

  it('returns a datatable with a new column with the values from mapping a function over each row in a datatable', () => {
    return fn(testTable, { name: 'pricePlusTwo', expression: pricePlusTwo }).then(result => {
      const arbitraryRowIndex = 2;

      expect(result.type).to.be('datatable');
      expect(result.columns).to.eql([
        ...testTable.columns,
        { name: 'pricePlusTwo', type: 'number' },
      ]);
      expect(result.columns[result.columns.length - 1]).to.have.property('name', 'pricePlusTwo');
      expect(result.rows[arbitraryRowIndex]).to.have.property('pricePlusTwo');
    });
  });

  it('overwrites existing column with the new column if an existing column name is provided', () => {
    return fn(testTable, { name: 'name', expression: pricePlusTwo }).then(result => {
      const nameColumnIndex = result.columns.findIndex(({ name }) => name === 'name');
      const arbitraryRowIndex = 4;

      expect(result.type).to.be('datatable');
      expect(result.columns).to.have.length(testTable.columns.length);
      expect(result.columns[nameColumnIndex])
        .to.have.property('name', 'name')
        .and.to.have.property('type', 'number');
      expect(result.rows[arbitraryRowIndex]).to.have.property('name', 202);
    });
  });

  it('adds a column to empty tables', () => {
    return fn(emptyTable, { name: 'name', expression: pricePlusTwo }).then(result => {
      expect(result.type).to.be('datatable');
      expect(result.columns).to.have.length(1);
      expect(result.columns[0])
        .to.have.property('name', 'name')
        .and.to.have.property('type', 'null');
    });
  });

  describe('expression', () => {
    it('maps null values to the new column', () => {
      return fn(testTable, { name: 'empty' }).then(result => {
        const emptyColumnIndex = result.columns.findIndex(({ name }) => name === 'empty');
        const arbitraryRowIndex = 8;

        expect(result.columns[emptyColumnIndex])
          .to.have.property('name', 'empty')
          .and.to.have.property('type', 'null');
        expect(result.rows[arbitraryRowIndex]).to.have.property('empty', null);
      });
    });
  });
});
