/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter } from '../../../__mocks__';

import { Schema, SchemaConflicts, SchemaTypes } from '../../../shared/types';

import { OpenModal, ServerFieldResultSettingObject } from './types';

import { ResultSettingsLogic } from '.';

describe('ResultSettingsLogic', () => {
  const { mount } = new LogicMounter(ResultSettingsLogic);

  const DEFAULT_VALUES = {
    dataLoading: true,
    saving: false,
    openModal: OpenModal.None,
    nonTextResultFields: {},
    resultFields: {},
    serverResultFields: {},
    textResultFields: {},
    lastSavedResultFields: {},
    schema: {},
    schemaConflicts: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const itShouldCloseOpenModals = (callback: () => void) => {
    mount({
      openModal: OpenModal.ConfirmSaveModal,
    });

    callback();

    expect(ResultSettingsLogic.values).toEqual({
      ...DEFAULT_VALUES,
      openModal: OpenModal.None,
    });
  };

  it('has expected default values', () => {
    mount();
    expect(ResultSettingsLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('initializeResultFields', () => {
      const serverResultFields: ServerFieldResultSettingObject = {
        foo: { raw: { size: 5 } },
        bar: { raw: { size: 5 } },
      };
      const schema: Schema = {
        foo: 'text' as SchemaTypes,
        bar: 'number' as SchemaTypes,
        baz: 'text' as SchemaTypes,
      };
      const schemaConflicts: SchemaConflicts = {
        foo: {
          text: ['foo'],
          number: ['foo'],
          geolocation: [],
          date: [],
        },
      };

      it('will initialize all result field state within the UI, based on provided server data', () => {
        mount({
          dataLoading: true,
          saving: true,
          openModal: OpenModal.ConfirmSaveModal,
        });

        ResultSettingsLogic.actions.initializeResultFields(
          serverResultFields,
          schema,
          schemaConflicts
        );

        expect(ResultSettingsLogic.values).toEqual({
          ...DEFAULT_VALUES,
          dataLoading: false,
          saving: false,
          // It converts the passed server result fields to a client results field and stores it
          // as resultFields
          resultFields: {
            foo: {
              raw: true,
              rawSize: 5,
              snippet: false,
              snippetFallback: false,
            },
            // Baz was not part of the original serverResultFields, it was injected based on the schema
            baz: {
              raw: false,
              snippet: false,
              snippetFallback: false,
            },
            bar: {
              raw: true,
              rawSize: 5,
              snippet: false,
              snippetFallback: false,
            },
          },
          // It also saves it as lastSavedResultFields
          lastSavedResultFields: {
            foo: {
              raw: true,
              rawSize: 5,
              snippet: false,
              snippetFallback: false,
            },
            // Baz was not part of the original serverResultFields, it was injected based on the schema
            baz: {
              raw: false,
              snippet: false,
              snippetFallback: false,
            },
            bar: {
              raw: true,
              rawSize: 5,
              snippet: false,
              snippetFallback: false,
            },
          },
          // The resultFields are also partitioned to either nonTextResultFields or textResultFields
          // depending on their type within the passed schema
          nonTextResultFields: {
            bar: {
              raw: true,
              rawSize: 5,
              snippet: false,
              snippetFallback: false,
            },
          },
          textResultFields: {
            // Baz was not part of the original serverResultFields, it was injected based on the schema
            baz: {
              raw: false,
              snippet: false,
              snippetFallback: false,
            },
            foo: {
              raw: true,
              rawSize: 5,
              snippet: false,
              snippetFallback: false,
            },
          },
          // It stores the originally passed results as serverResultFields
          serverResultFields: {
            foo: { raw: { size: 5 } },
            // Baz was not part of the original serverResultFields, it was injected based on the schema
            baz: {},
            bar: { raw: { size: 5 } },
          },
          // The modal should be reset back to closed if it had been opened previously
          openModal: OpenModal.None,
          // Stores the provided schema details
          schema,
          schemaConflicts,
        });
      });

      it('default schema conflicts data if none was provided', () => {
        mount();

        ResultSettingsLogic.actions.initializeResultFields(serverResultFields, schema);

        expect(ResultSettingsLogic.values.schemaConflicts).toEqual({});
      });
    });

    describe('openConfirmSaveModal', () => {
      mount({
        openModal: OpenModal.None,
      });

      ResultSettingsLogic.actions.openConfirmSaveModal();

      expect(ResultSettingsLogic.values).toEqual({
        ...DEFAULT_VALUES,
        openModal: OpenModal.ConfirmSaveModal,
      });
    });

    describe('openConfirmResetModal', () => {
      mount({
        openModal: OpenModal.None,
      });

      ResultSettingsLogic.actions.openConfirmResetModal();

      expect(ResultSettingsLogic.values).toEqual({
        ...DEFAULT_VALUES,
        openModal: OpenModal.ConfirmResetModal,
      });
    });

    describe('closeModals', () => {
      itShouldCloseOpenModals(() => {
        ResultSettingsLogic.actions.closeModals();
      });
    });

    describe('clearAllFields', () => {
      it('should remove all settings that have been set for each field', () => {
        mount({
          nonTextResultFields: {
            foo: { raw: false, snippet: false, snippetFallback: false },
            bar: { raw: true, snippet: false, snippetFallback: true },
          },
          textResultFields: {
            qux: { raw: false, snippet: false, snippetFallback: false },
            quux: { raw: true, snippet: false, snippetFallback: true },
          },
          resultFields: {
            quuz: { raw: false, snippet: false, snippetFallback: false },
            corge: { raw: true, snippet: false, snippetFallback: true },
          },
          serverResultFields: {
            grault: { raw: { size: 5 } },
            garply: { raw: true },
          },
        });

        ResultSettingsLogic.actions.clearAllFields();

        expect(ResultSettingsLogic.values).toEqual({
          ...DEFAULT_VALUES,
          nonTextResultFields: {
            foo: {},
            bar: {},
          },
          textResultFields: {
            qux: {},
            quux: {},
          },
          resultFields: {
            quuz: {},
            corge: {},
          },
          serverResultFields: {
            grault: {},
            garply: {},
          },
        });
      });
    });

    describe('resetAllFields', () => {
      it('should reset all settings to their default values per field', () => {
        mount({
          nonTextResultFields: {
            foo: { raw: true, snippet: true, snippetFallback: true },
            bar: { raw: true, snippet: true, snippetFallback: true },
          },
          textResultFields: {
            qux: { raw: true, snippet: true, snippetFallback: true },
            quux: { raw: true, snippet: true, snippetFallback: true },
          },
          resultFields: {
            quuz: { raw: true, snippet: true, snippetFallback: true },
            corge: { raw: true, snippet: true, snippetFallback: true },
          },
          serverResultFields: {
            grault: { raw: { size: 5 } },
            garply: { raw: true },
          },
        });

        ResultSettingsLogic.actions.resetAllFields();

        expect(ResultSettingsLogic.values).toEqual({
          ...DEFAULT_VALUES,
          nonTextResultFields: {
            bar: { raw: true, snippet: false, snippetFallback: false },
            foo: { raw: true, snippet: false, snippetFallback: false },
          },
          textResultFields: {
            qux: { raw: true, snippet: false, snippetFallback: false },
            quux: { raw: true, snippet: false, snippetFallback: false },
          },
          resultFields: {
            quuz: { raw: true, snippet: false, snippetFallback: false },
            corge: { raw: true, snippet: false, snippetFallback: false },
          },
          serverResultFields: {
            grault: { raw: {} },
            garply: { raw: {} },
          },
        });
      });

      it('should close any open modal', () => {
        itShouldCloseOpenModals(() => {
          ResultSettingsLogic.actions.resetAllFields();
        });
      });
    });

    describe('updateField', () => {
      const initialValues = {
        nonTextResultFields: {
          foo: { raw: true, snippet: true, snippetFallback: true },
          bar: { raw: true, snippet: true, snippetFallback: true },
        },
        textResultFields: {
          foo: { raw: true, snippet: true, snippetFallback: true },
          bar: { raw: true, snippet: true, snippetFallback: true },
        },
        resultFields: {
          foo: { raw: true, snippet: true, snippetFallback: true },
          bar: { raw: true, snippet: true, snippetFallback: true },
        },
        serverResultFields: {
          foo: { raw: { size: 5 } },
          bar: { raw: true },
        },
      };

      it('should update settings for an individual field', () => {
        mount(initialValues);

        ResultSettingsLogic.actions.updateField('foo', {
          raw: true,
          snippet: false,
          snippetFallback: false,
        });

        expect(ResultSettingsLogic.values).toEqual({
          ...DEFAULT_VALUES,
          // the settings for foo are updated below for any *ResultFields state in which they appear
          nonTextResultFields: {
            foo: { raw: true, snippet: false, snippetFallback: false },
            bar: { raw: true, snippet: true, snippetFallback: true },
          },
          textResultFields: {
            foo: { raw: true, snippet: false, snippetFallback: false },
            bar: { raw: true, snippet: true, snippetFallback: true },
          },
          resultFields: {
            foo: { raw: true, snippet: false, snippetFallback: false },
            bar: { raw: true, snippet: true, snippetFallback: true },
          },
          serverResultFields: {
            // Note that the specified settings for foo get converted to a "server" format here
            foo: { raw: {} },
            bar: { raw: true },
          },
        });
      });

      it('should do nothing if the specified field does not exist', () => {
        mount(initialValues);

        ResultSettingsLogic.actions.updateField('baz', {
          raw: false,
          snippet: false,
          snippetFallback: false,
        });

        // 'baz' does not exist in state, so nothing is updated
        expect(ResultSettingsLogic.values).toEqual({
          ...DEFAULT_VALUES,
          ...initialValues,
        });
      });
    });

    describe('saving', () => {
      it('sets saving to true and close any open modals', () => {
        mount({
          saving: false,
        });

        ResultSettingsLogic.actions.saving();

        expect(ResultSettingsLogic.values).toEqual({
          ...DEFAULT_VALUES,
          saving: true,
          openModal: OpenModal.None,
        });
      });
    });
  });
});
