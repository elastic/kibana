/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter } from '../../../__mocks__/kea_logic';

import { InlineEditableTableLogic } from './inline_editable_table_logic';

describe('InlineEditableTableLogic', () => {
  const { mount } = new LogicMounter(InlineEditableTableLogic);

  const DEFAULT_VALUES = {
    doesEditingItemValueContainEmptyProperty: false,
    editingItemId: null,
    editingItemValue: null,
    formErrors: {},
    isEditing: false,
    isEditingUnsavedItem: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mountLogic = (values: object = {}) => mount(values, { instanceId: '1' });

  it('has expected default values', () => {
    const logic = mountLogic();
    expect(logic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('deleteItem', () => {
      const logic = mountLogic();
      logic.actions.deleteItem();
      expect(logic.values).toEqual(DEFAULT_VALUES);
    });
    describe('doneEditing', () => {
      const logic = mountLogic();
      logic.actions.doneEditing();
      expect(logic.values).toEqual(DEFAULT_VALUES);
    });
    describe('editNewItem', () => {
      const logic = mountLogic();
      logic.actions.editNewItem();
      expect(logic.values).toEqual(DEFAULT_VALUES);
    });
    describe('editExistingItem', () => {
      const logic = mountLogic();
      logic.actions.editExistingItem();
      expect(logic.values).toEqual(DEFAULT_VALUES);
    });
    describe('reorderItems', () => {
      const logic = mountLogic();
      logic.actions.reorderItems();
      expect(logic.values).toEqual(DEFAULT_VALUES);
    });
    describe('saveExistingItem', () => {
      const logic = mountLogic();
      logic.actions.saveExistingItem();
      expect(logic.values).toEqual(DEFAULT_VALUES);
    });
    describe('saveNewItem', () => {
      const logic = mountLogic();
      logic.actions.saveNewItem();
      expect(logic.values).toEqual(DEFAULT_VALUES);
    });
    describe('setEditingItemValue', () => {
      const logic = mountLogic();
      logic.actions.setEditingItemValue();
      expect(logic.values).toEqual(DEFAULT_VALUES);
    });
    describe('setFormErrors', () => {
      const logic = mountLogic();
      logic.actions.setFormErrors();
      expect(logic.values).toEqual(DEFAULT_VALUES);
    });
  });
});
