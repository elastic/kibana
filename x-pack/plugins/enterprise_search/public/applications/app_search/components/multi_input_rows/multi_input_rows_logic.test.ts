/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter } from '../../../__mocks__/kea_logic';

import { Logic } from 'kea';

import { MultiInputRowsLogic } from './multi_input_rows_logic';

describe('MultiInputRowsLogic', () => {
  const { mount } = new LogicMounter(MultiInputRowsLogic);

  const MOCK_VALUES = ['a', 'b', 'c'];

  const DEFAULT_PROPS = {
    id: 'test',
    values: MOCK_VALUES,
  };
  const DEFAULT_VALUES = {
    values: MOCK_VALUES,
    addedNewRow: false,
    hasEmptyValues: false,
    hasOnlyOneValue: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('has expected default values passed from props', () => {
    const logic = mount({}, DEFAULT_PROPS);
    expect(logic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    let logic: Logic;

    beforeEach(() => {
      logic = mount({}, DEFAULT_PROPS);
    });

    afterEach(() => {
      // Should not mutate the original array
      expect(logic.values.values).not.toBe(MOCK_VALUES); // Would fail if we did not clone a new array
    });

    describe('addValue', () => {
      it('appends an empty string to the values array & sets addedNewRow to true', () => {
        logic.actions.addValue();

        expect(logic.values).toEqual({
          ...DEFAULT_VALUES,
          addedNewRow: true,
          hasEmptyValues: true,
          values: ['a', 'b', 'c', ''],
        });
      });
    });

    describe('deleteValue', () => {
      it('deletes the value at the specified array index', () => {
        logic.actions.deleteValue(1);

        expect(logic.values).toEqual({
          ...DEFAULT_VALUES,
          values: ['a', 'c'],
        });
      });
    });

    describe('editValue', () => {
      it('edits the value at the specified array index', () => {
        logic.actions.editValue(2, 'z');

        expect(logic.values).toEqual({
          ...DEFAULT_VALUES,
          values: ['a', 'b', 'z'],
        });
      });
    });
  });

  describe('selectors', () => {
    describe('hasEmptyValues', () => {
      it('returns true if values has any empty strings', () => {
        const logic = mount({}, { ...DEFAULT_PROPS, values: ['', '', ''] });

        expect(logic.values.hasEmptyValues).toEqual(true);
      });
    });

    describe('hasOnlyOneValue', () => {
      it('returns true if values only has one item', () => {
        const logic = mount({}, { ...DEFAULT_PROPS, values: ['test'] });

        expect(logic.values.hasOnlyOneValue).toEqual(true);
      });
    });
  });
});
