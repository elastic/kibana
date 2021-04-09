/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter } from '../../../__mocks__';

import { MultiInputRowsLogic } from './multi_input_rows_logic';

describe('MultiInputRowsLogic', () => {
  const { mount } = new LogicMounter(MultiInputRowsLogic);

  const MOCK_VALUES = ['a', 'b', 'c'];

  const DEFAULT_PROPS = { values: MOCK_VALUES };
  const DEFAULT_VALUES = {
    values: MOCK_VALUES,
    hasEmptyValues: false,
    hasOnlyOneValue: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('has expected default values passed from props', () => {
    mount({}, DEFAULT_PROPS);
    expect(MultiInputRowsLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    afterEach(() => {
      // Should not mutate the original array
      expect(MultiInputRowsLogic.values.values).not.toBe(MOCK_VALUES); // Would fail if we did not clone a new array
    });

    describe('addValue', () => {
      it('appends an empty string to the values array', () => {
        mount(DEFAULT_VALUES);
        MultiInputRowsLogic.actions.addValue();

        expect(MultiInputRowsLogic.values).toEqual({
          ...DEFAULT_VALUES,
          hasEmptyValues: true,
          values: ['a', 'b', 'c', ''],
        });
      });
    });

    describe('deleteValue', () => {
      it('deletes the value at the specified array index', () => {
        mount(DEFAULT_VALUES);
        MultiInputRowsLogic.actions.deleteValue(1);

        expect(MultiInputRowsLogic.values).toEqual({
          ...DEFAULT_VALUES,
          values: ['a', 'c'],
        });
      });
    });

    describe('editValue', () => {
      it('edits the value at the specified array index', () => {
        mount(DEFAULT_VALUES);
        MultiInputRowsLogic.actions.editValue(2, 'z');

        expect(MultiInputRowsLogic.values).toEqual({
          ...DEFAULT_VALUES,
          values: ['a', 'b', 'z'],
        });
      });
    });
  });

  describe('selectors', () => {
    describe('hasEmptyValues', () => {
      it('returns true if values has any empty strings', () => {
        mount({}, { values: ['', '', ''] });

        expect(MultiInputRowsLogic.values.hasEmptyValues).toEqual(true);
      });
    });

    describe('hasOnlyOneValue', () => {
      it('returns true if values only has one item', () => {
        mount({}, { values: ['test'] });

        expect(MultiInputRowsLogic.values.hasOnlyOneValue).toEqual(true);
      });
    });
  });
});
