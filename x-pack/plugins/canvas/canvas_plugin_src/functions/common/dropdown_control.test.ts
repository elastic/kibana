/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { functionWrapper } from '../../../../../../src/plugins/presentation_util/common/lib';
import { testTable, relationalTable } from './__fixtures__/test_tables';
import { dropdownControl } from './dropdownControl';
import { ExecutionContext, SerializableState } from 'src/plugins/expressions';
import { Adapters } from 'src/plugins/inspector';

describe('dropdownControl', () => {
  const fn = functionWrapper(dropdownControl);

  it('returns a render as dropdown_filter', () => {
    expect(
      fn(
        testTable,
        { filterColumn: 'name', valueColumn: 'name' },
        {} as ExecutionContext<Adapters, SerializableState>
      )
    ).toHaveProperty('type', 'render');
    expect(
      fn(
        testTable,
        { filterColumn: 'name', valueColumn: 'name' },
        {} as ExecutionContext<Adapters, SerializableState>
      )
    ).toHaveProperty('as', 'dropdown_filter');
  });

  describe('args', () => {
    describe('valueColumn', () => {
      it('populates dropdown choices with unique values in valueColumn', () => {
        const uniqueNames = testTable.rows.reduce<Array<[string, string]>>(
          (unique, { name }) =>
            unique.find(([value, label]) => value === name) ? unique : [...unique, [name, name]],
          []
        );
        expect(
          fn(
            testTable,
            { valueColumn: 'name' },
            {} as ExecutionContext<Adapters, SerializableState>
          )?.value?.choices
        ).toEqual(uniqueNames);
      });

      it('returns an empty array when provided an invalid column', () => {
        expect(
          fn(testTable, { valueColumn: 'foo' }, {} as ExecutionContext<Adapters, SerializableState>)
            ?.value?.choices
        ).toEqual([]);
        expect(
          fn(testTable, { valueColumn: '' }, {} as ExecutionContext<Adapters, SerializableState>)
            ?.value?.choices
        ).toEqual([]);
      });
    });

    describe('labelColumn', () => {
      it('populates dropdown choices with labels from label column', () => {
        const expectedChoices = relationalTable.rows.map((row) => [row.id, row.name]);
        expect(
          fn(
            relationalTable,
            { valueColumn: 'id', labelColumn: 'name' },
            {} as ExecutionContext<Adapters, SerializableState>
          )?.value?.choices
        ).toEqual(expectedChoices);
      });
    });
  });

  describe('filterColumn', () => {
    it('sets which column the filter is applied to', () => {
      expect(
        fn(testTable, { filterColumn: 'name' }, {} as ExecutionContext<Adapters, SerializableState>)
          ?.value
      ).toHaveProperty('column', 'name');
      expect(
        fn(
          testTable,
          { filterColumn: 'name', valueColumn: 'price' },
          {} as ExecutionContext<Adapters, SerializableState>
        )?.value
      ).toHaveProperty('column', 'name');
    });

    it('defaults to valueColumn if not provided', () => {
      expect(
        fn(testTable, { valueColumn: 'price' }, {} as ExecutionContext<Adapters, SerializableState>)
          ?.value
      ).toHaveProperty('column', 'price');
    });

    it('sets column to undefined if no args are provided', () => {
      expect(
        fn(testTable, {}, {} as ExecutionContext<Adapters, SerializableState>)?.value
      ).toHaveProperty('column', undefined);
    });
  });
});
