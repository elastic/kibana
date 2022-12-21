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

import { omit } from 'lodash';

import { InlineEditableTableLogic } from './inline_editable_table_logic';

interface Foo {
  id: number;
  foo: string;
  bar: string;
}

describe('InlineEditableTableLogic', () => {
  const { mount } = new LogicMounter(InlineEditableTableLogic);

  const DEFAULT_VALUES = {
    editingItemValue: null,
    fieldErrors: {},
    rowErrors: [],
  };

  const SELECTORS = {
    editingItemId: null,
    isEditing: false,
    doesEditingItemValueContainEmptyProperty: false,
    isEditingUnsavedItem: false,
  };

  // Values without selectors
  const logicValuesWithoutSelectors = (logic: any) => omit(logic.values, Object.keys(SELECTORS));

  beforeEach(() => {
    jest.resetAllMocks();
  });

  const DEFAULT_LOGIC_PARAMS = {
    instanceId: '1',
    columns: [
      {
        field: 'foo',
        render: jest.fn(),
        editingRender: jest.fn(),
      },
      {
        field: 'bar',
        render: jest.fn(),
        editingRender: jest.fn(),
      },
    ],
    onAdd: jest.fn(),
    onDelete: jest.fn(),
    onReorder: jest.fn(),
    onUpdate: jest.fn(),
    transformItem: jest.fn(),
    validateItem: jest.fn(),
  };

  const mountLogic = (values: object = {}, params: object = DEFAULT_LOGIC_PARAMS) =>
    mount(values, params);

  it('has expected default values', () => {
    const logic = mountLogic();
    expect(logic.values).toEqual({
      ...DEFAULT_VALUES,
      ...SELECTORS,
    });
  });

  describe('actions', () => {
    describe('deleteItem', () => {
      const logic = mountLogic();
      logic.actions.deleteItem();
      expect(logicValuesWithoutSelectors(logic)).toEqual(DEFAULT_VALUES);
    });

    describe('doneEditing', () => {
      it('resets a bunch of values', () => {
        const logic = mountLogic({
          isEditing: true,
          editingItemId: 1,
          editingItemValue: {},
          fieldErrors: { foo: 'I am error for foo' },
        });
        logic.actions.doneEditing();
        expect(logicValuesWithoutSelectors(logic)).toEqual(DEFAULT_VALUES);
      });
    });

    describe('editNewItem', () => {
      it('updates state to reflect a new item being edited', () => {
        const logic = mountLogic({
          editingItemValue: {
            id: 1,
            foo: 'some foo',
            bar: 'some bar',
          },
        });
        logic.actions.editNewItem();
        expect(logicValuesWithoutSelectors(logic)).toEqual({
          ...DEFAULT_VALUES,
          editingItemValue: {
            // Note that new values do not yet have an id
            foo: '',
            bar: '',
          },
        });
      });
    });

    describe('editExistingItem', () => {
      it('updates state to reflect the item that was passed being edited', () => {
        const logic = mountLogic({
          editingItemValue: {
            id: 1,
            foo: '',
            bar: '',
          },
        });
        logic.actions.editExistingItem({
          id: 2,
          foo: 'existing foo',
          bar: 'existing bar',
        });
        expect(logicValuesWithoutSelectors(logic)).toEqual({
          ...DEFAULT_VALUES,
          editingItemValue: {
            id: 2,
            foo: 'existing foo',
            bar: 'existing bar',
          },
        });
      });
    });

    describe('setFieldErrors', () => {
      it('sets fieldErrors', () => {
        const fieldErrors = {
          foo: 'I am an error for foo',
        };
        const logic = mountLogic();
        logic.actions.setFieldErrors(fieldErrors);
        expect(logicValuesWithoutSelectors(logic)).toEqual({
          ...DEFAULT_VALUES,
          fieldErrors,
        });
      });
    });

    describe('setRowErrors', () => {
      it('sets rowErrors', () => {
        const rowErrors = ['I am a row error'];
        const logic = mountLogic();
        logic.actions.setRowErrors(rowErrors);
        expect(logicValuesWithoutSelectors(logic)).toEqual({
          ...DEFAULT_VALUES,
          rowErrors,
        });
      });
    });

    describe('setEditingItemValue', () => {
      it('updates the state of the item currently being edited and resets field errors', () => {
        const logic = mountLogic({
          editingItemValue: {
            id: 1,
            foo: '',
            bar: '',
          },
          fieldErrors: { foo: 'I am error for foo' },
        });
        logic.actions.setEditingItemValue({
          id: 1,
          foo: 'blah blah',
          bar: '',
        });
        expect(logicValuesWithoutSelectors(logic)).toEqual({
          ...DEFAULT_VALUES,
          editingItemValue: {
            id: 1,
            foo: 'blah blah',
            bar: '',
          },
          fieldErrors: {},
        });
      });
    });
  });

  describe('selectors', () => {
    describe('isEditing', () => {
      it('is true when the user is currently editing an item', () => {
        const logic = mountLogic({
          editingItemValue: {
            id: null,
            foo: '',
          },
        });

        expect(logic.values.isEditing).toBe(true);
      });

      it('is false when the user is NOT currently editing an item', () => {
        const logic = mountLogic({
          editingItemValue: null,
        });

        expect(logic.values.isEditing).toBe(false);
      });
    });

    describe('editingItemId', () => {
      it('equals the id of the currently edited item', () => {
        const logic = mountLogic({
          editingItemValue: {
            id: 1,
            foo: '',
          },
        });

        expect(logic.values.editingItemId).toBe(1);
      });

      it('equals null if the currently edited item is a new unsaved item', () => {
        const logic = mountLogic({
          editingItemValue: {
            id: null,
            foo: '',
          },
        });

        expect(logic.values.editingItemId).toBe(null);
      });

      it('is null when the user is NOT currently editing an item', () => {
        const logic = mountLogic({
          editingItemValue: null,
        });

        expect(logic.values.editingItemId).toBe(null);
      });
    });

    describe('isEditingUnsavedItem', () => {
      it('is true when the user is currently editing an unsaved item', () => {
        const logic = mountLogic({
          editingItemValue: {
            id: null,
            foo: '',
          },
        });

        expect(logic.values.isEditingUnsavedItem).toBe(true);
      });

      it('is false when the user is NOT currently editing an unsaved item', () => {
        const logic = mountLogic({
          isEditing: true,
          editingItemId: 1,
        });

        expect(logic.values.isEditingUnsavedItem).toBe(false);
      });
    });

    describe('doesEditingItemValueContainEmptyProperty', () => {
      it('is true when the user is currently editing an item that has empty properties', () => {
        const logic = mountLogic({
          isEditing: true,
          editingItemValue: {
            id: 1,
            foo: '',
          },
          editingItemId: 1,
        });

        expect(logic.values.doesEditingItemValueContainEmptyProperty).toBe(true);
      });

      it('is false when no properties are empty', () => {
        const logic = mountLogic({
          isEditing: true,
          editingItemValue: {
            id: 1,
            foo: 'foo',
          },
          editingItemId: 1,
        });

        expect(logic.values.doesEditingItemValueContainEmptyProperty).toBe(false);
      });

      it('is false when the user is not editing anything', () => {
        const logic = mountLogic({
          isEditing: true,
          editingItemValue: null,
          editingItemId: null,
        });

        expect(logic.values.doesEditingItemValueContainEmptyProperty).toBe(false);
      });
    });
  });

  describe('listeners', () => {
    describe('reorderItems', () => {
      it('will call the provided onReorder callback', () => {
        const items: Foo[] = [];
        const oldItems: Foo[] = [];
        const logic = mountLogic();
        logic.actions.reorderItems(items, oldItems);
        expect(DEFAULT_LOGIC_PARAMS.onReorder).toHaveBeenCalledWith(
          items,
          oldItems,
          expect.any(Function)
        );
      });

      it('will not call the onReorder callback if one was not provided', () => {
        const items: Foo[] = [];
        const oldItems: Foo[] = [];
        const logic = mountLogic(
          {},
          {
            ...DEFAULT_LOGIC_PARAMS,
            onReorder: undefined,
          }
        );
        logic.actions.reorderItems(items, oldItems);
      });
    });

    describe('saveExistingItem', () => {
      it('will call the provided onUpdate callback if the item being edited validates', () => {
        const editingItemValue = {};
        DEFAULT_LOGIC_PARAMS.validateItem.mockReturnValue({});
        const logic = mountLogic({
          ...DEFAULT_VALUES,
          editingItemValue,
        });
        logic.actions.saveExistingItem();
        expect(DEFAULT_LOGIC_PARAMS.onUpdate).toHaveBeenCalledWith(
          editingItemValue,
          expect.any(Function)
        );
      });

      it('will set field errors and not call the provided onUpdate callback if the item being edited does not validate', () => {
        const editingItemValue = {};
        const fieldErrors = {
          foo: 'some error',
        };
        DEFAULT_LOGIC_PARAMS.validateItem.mockReturnValue(fieldErrors);
        const logic = mountLogic({
          ...DEFAULT_VALUES,
          editingItemValue,
        });
        jest.spyOn(logic.actions, 'setFieldErrors');
        logic.actions.saveExistingItem();
        expect(DEFAULT_LOGIC_PARAMS.onUpdate).not.toHaveBeenCalled();
        expect(logic.actions.setFieldErrors).toHaveBeenCalledWith(fieldErrors);
      });

      it('will do neither if no value is currently being edited', () => {
        const editingItemValue = null;
        const logic = mountLogic({
          ...DEFAULT_VALUES,
          editingItemValue,
        });
        jest.spyOn(logic.actions, 'setFieldErrors');
        logic.actions.saveExistingItem();
        expect(DEFAULT_LOGIC_PARAMS.onUpdate).not.toHaveBeenCalled();
        expect(logic.actions.setFieldErrors).not.toHaveBeenCalled();
      });

      it('will always call the provided onUpdate callback if no validateItem param was provided', () => {
        const editingItemValue = {};
        const logic = mountLogic(
          {
            ...DEFAULT_VALUES,
            editingItemValue,
          },
          {
            ...DEFAULT_LOGIC_PARAMS,
            validateItem: undefined,
          }
        );
        logic.actions.saveExistingItem();
        expect(DEFAULT_LOGIC_PARAMS.onUpdate).toHaveBeenCalledWith(
          editingItemValue,
          expect.any(Function)
        );
      });
    });

    describe('saveNewItem', () => {
      it('will call the provided onAdd callback if the new item validates', () => {
        const editingItemValue = {};
        DEFAULT_LOGIC_PARAMS.validateItem.mockReturnValue({});
        const logic = mountLogic(
          {
            ...DEFAULT_VALUES,
            editingItemValue,
          },
          {
            ...DEFAULT_LOGIC_PARAMS,
            transformItem: undefined,
          }
        );
        logic.actions.saveNewItem();
        expect(DEFAULT_LOGIC_PARAMS.onAdd).toHaveBeenCalledWith(
          editingItemValue,
          expect.any(Function)
        );
      });

      it('will transform the item first if transformItem callback is provided', () => {
        const editingItemValue = {};
        const transformedItem = {};
        DEFAULT_LOGIC_PARAMS.validateItem.mockReturnValue({});
        DEFAULT_LOGIC_PARAMS.transformItem.mockReturnValue(transformedItem);
        const logic = mountLogic({
          ...DEFAULT_VALUES,
          editingItemValue,
        });
        logic.actions.saveNewItem();
        expect(DEFAULT_LOGIC_PARAMS.onAdd).toHaveBeenCalledWith(
          transformedItem,
          expect.any(Function)
        );
      });

      it('will set field errors and not call the provided onAdd callback if the item being edited does not validate', () => {
        const editingItemValue = {};
        const fieldErrors = {
          foo: 'some error',
        };
        DEFAULT_LOGIC_PARAMS.validateItem.mockReturnValue(fieldErrors);
        const logic = mountLogic({
          ...DEFAULT_VALUES,
          editingItemValue,
        });
        jest.spyOn(logic.actions, 'setFieldErrors');
        logic.actions.saveNewItem();
        expect(DEFAULT_LOGIC_PARAMS.onAdd).not.toHaveBeenCalled();
        expect(logic.actions.setFieldErrors).toHaveBeenCalledWith(fieldErrors);
      });

      it('will do nothing if no value is currently being edited', () => {
        const editingItemValue = null;
        const logic = mountLogic({
          ...DEFAULT_VALUES,
          editingItemValue,
        });
        jest.spyOn(logic.actions, 'setFieldErrors');
        logic.actions.saveNewItem();
        expect(DEFAULT_LOGIC_PARAMS.onAdd).not.toHaveBeenCalled();
        expect(logic.actions.setFieldErrors).not.toHaveBeenCalled();
      });

      it('will always call the provided onAdd callback if no validateItem param was provided', () => {
        const editingItemValue = {};
        const logic = mountLogic(
          {
            ...DEFAULT_VALUES,
            editingItemValue,
          },
          {
            ...DEFAULT_LOGIC_PARAMS,
            validateItem: undefined,
            transformItem: undefined,
          }
        );
        logic.actions.saveNewItem();
        expect(DEFAULT_LOGIC_PARAMS.onAdd).toHaveBeenCalledWith(
          editingItemValue,
          expect.any(Function)
        );
      });
    });
  });
});
