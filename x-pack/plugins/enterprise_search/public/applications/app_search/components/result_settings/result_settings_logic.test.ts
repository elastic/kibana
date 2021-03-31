/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter, mockFlashMessageHelpers, mockHttpValues } from '../../../__mocks__';

import { mockEngineValues } from '../../__mocks__';

import { omit } from 'lodash';

import { nextTick } from '@kbn/test/jest';

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

  const SELECTORS = {
    reducedServerResultFields: {},
    resultFieldsAtDefaultSettings: true,
    resultFieldsEmpty: true,
    stagedUpdates: false,
  };

  // Values without selectors
  const resultSettingLogicValues = () => omit(ResultSettingsLogic.values, Object.keys(SELECTORS));

  beforeEach(() => {
    jest.clearAllMocks();
    mockEngineValues.engineName = 'test-engine';
  });

  it('has expected default values', () => {
    mount();
    expect(ResultSettingsLogic.values).toEqual({
      ...DEFAULT_VALUES,
      ...SELECTORS,
    });
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

        expect(resultSettingLogicValues()).toEqual({
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

      expect(resultSettingLogicValues()).toEqual({
        ...DEFAULT_VALUES,
        openModal: OpenModal.ConfirmSaveModal,
      });
    });

    describe('openConfirmResetModal', () => {
      mount({
        openModal: OpenModal.None,
      });

      ResultSettingsLogic.actions.openConfirmResetModal();

      expect(resultSettingLogicValues()).toEqual({
        ...DEFAULT_VALUES,
        openModal: OpenModal.ConfirmResetModal,
      });
    });

    describe('closeModals', () => {
      it('should close open modals', () => {
        mount({
          openModal: OpenModal.ConfirmSaveModal,
        });

        ResultSettingsLogic.actions.closeModals();

        expect(resultSettingLogicValues()).toEqual({
          ...DEFAULT_VALUES,
          openModal: OpenModal.None,
        });
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

        expect(resultSettingLogicValues()).toEqual({
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

        expect(resultSettingLogicValues()).toEqual({
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

      it('should close open modals', () => {
        mount({
          openModal: OpenModal.ConfirmSaveModal,
        });

        ResultSettingsLogic.actions.resetAllFields();

        expect(resultSettingLogicValues()).toEqual({
          ...DEFAULT_VALUES,
          openModal: OpenModal.None,
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

        expect(resultSettingLogicValues()).toEqual({
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
        expect(resultSettingLogicValues()).toEqual({
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

        expect(resultSettingLogicValues()).toEqual({
          ...DEFAULT_VALUES,
          saving: true,
          openModal: OpenModal.None,
        });
      });
    });
  });

  describe('selectors', () => {
    describe('resultFieldsAtDefaultSettings', () => {
      it('should return true if all fields are at their default settings', () => {
        mount({
          resultFields: {
            foo: { raw: true, snippet: false, snippetFallback: false },
            bar: { raw: true, snippet: false, snippetFallback: false },
          },
        });

        expect(ResultSettingsLogic.values.resultFieldsAtDefaultSettings).toEqual(true);
      });

      it('should return false otherwise', () => {
        mount({
          resultFields: {
            foo: { raw: true, snippet: false, snippetFallback: false },
            bar: { raw: true, snippet: true, snippetFallback: false },
          },
        });

        expect(ResultSettingsLogic.values.resultFieldsAtDefaultSettings).toEqual(false);
      });
    });

    describe('resultFieldsEmpty', () => {
      it('should return true if all fields are empty', () => {
        mount({
          resultFields: {
            foo: {},
            bar: {},
          },
        });

        expect(ResultSettingsLogic.values.resultFieldsEmpty).toEqual(true);
      });

      it('should return false otherwise', () => {
        mount({
          resultFields: {
            foo: {},
            bar: { raw: true, snippet: true, snippetFallback: false },
          },
        });

        expect(ResultSettingsLogic.values.resultFieldsEmpty).toEqual(false);
      });
    });

    describe('stagedUpdates', () => {
      it('should return true if changes have been made since the last save', () => {
        mount({
          lastSavedResultFields: {
            foo: {},
            bar: { raw: true, snippet: true, snippetFallback: false },
          },
          resultFields: {
            foo: { raw: false, snippet: true, snippetFallback: true },
            bar: { raw: true, snippet: true, snippetFallback: false },
          },
        });

        // resultFields is different than lastSavedResultsFields, which happens if changes
        // have been made since the last save, which is represented by lastSavedResultFields
        expect(ResultSettingsLogic.values.stagedUpdates).toEqual(true);
      });

      it('should return false otherwise', () => {
        mount({
          lastSavedResultFields: {
            foo: { raw: false, snippet: true, snippetFallback: true },
            bar: { raw: true, snippet: true, snippetFallback: false },
          },
          resultFields: {
            foo: { raw: false, snippet: true, snippetFallback: true },
            bar: { raw: true, snippet: true, snippetFallback: false },
          },
        });

        expect(ResultSettingsLogic.values.stagedUpdates).toEqual(false);
      });
    });

    describe('reducedServerResultFields', () => {
      it('filters out fields that do not have any settings', () => {
        mount({
          serverResultFields: {
            foo: { raw: { size: 5 } },
            bar: {},
          },
        });

        expect(ResultSettingsLogic.values.reducedServerResultFields).toEqual({
          // bar was filtered out because it has neither raw nor snippet data set
          foo: { raw: { size: 5 } },
        });
      });
    });
  });

  describe('listeners', () => {
    const { http } = mockHttpValues;
    const { flashAPIErrors } = mockFlashMessageHelpers;

    const serverFieldResultSettings = {
      foo: {
        raw: {},
      },
      bar: {
        raw: {},
      },
    };
    const schema = {
      foo: 'text',
      bar: 'number',
    };
    const schemaConflicts = {
      baz: {
        text: ['test'],
        number: ['test2'],
      },
    };

    describe('clearRawSizeForField', () => {
      it('should remove the raw size set on a field', () => {
        mount({
          resultFields: {
            foo: { raw: true, rawSize: 5, snippet: false },
            bar: { raw: true, rawSize: 5, snippet: false },
          },
        });
        jest.spyOn(ResultSettingsLogic.actions, 'updateField');

        ResultSettingsLogic.actions.clearRawSizeForField('foo');

        expect(ResultSettingsLogic.actions.updateField).toHaveBeenCalledWith('foo', {
          raw: true,
          snippet: false,
        });
      });
    });

    describe('clearSnippetSizeForField', () => {
      it('should remove the snippet size set on a field', () => {
        mount({
          resultFields: {
            foo: { raw: false, snippet: true, snippetSize: 5 },
            bar: { raw: true, rawSize: 5, snippet: false },
          },
        });
        jest.spyOn(ResultSettingsLogic.actions, 'updateField');

        ResultSettingsLogic.actions.clearSnippetSizeForField('foo');

        expect(ResultSettingsLogic.actions.updateField).toHaveBeenCalledWith('foo', {
          raw: false,
          snippet: true,
        });
      });
    });

    describe('toggleRawForField', () => {
      it('should toggle the raw value on for a field', () => {
        mount({
          resultFields: {
            foo: { raw: false, snippet: true, snippetSize: 5 },
            bar: { raw: false, snippet: false },
          },
        });
        jest.spyOn(ResultSettingsLogic.actions, 'updateField');

        ResultSettingsLogic.actions.toggleRawForField('bar');

        expect(ResultSettingsLogic.actions.updateField).toHaveBeenCalledWith('bar', {
          raw: true,
          snippet: false,
        });
      });

      it('should maintain rawSize if it was set prior', () => {
        mount({
          resultFields: {
            foo: { raw: false, snippet: true, snippetSize: 5 },
            bar: { raw: false, rawSize: 10, snippet: false },
          },
        });
        jest.spyOn(ResultSettingsLogic.actions, 'updateField');

        ResultSettingsLogic.actions.toggleRawForField('bar');

        expect(ResultSettingsLogic.actions.updateField).toHaveBeenCalledWith('bar', {
          raw: true,
          rawSize: 10,
          snippet: false,
        });
      });

      it('should remove rawSize value when toggling off', () => {
        mount({
          resultFields: {
            foo: { raw: false, snippet: true, snippetSize: 5 },
            bar: { raw: true, rawSize: 5, snippet: false },
          },
        });
        jest.spyOn(ResultSettingsLogic.actions, 'updateField');

        ResultSettingsLogic.actions.toggleRawForField('bar');

        expect(ResultSettingsLogic.actions.updateField).toHaveBeenCalledWith('bar', {
          raw: false,
          snippet: false,
        });
      });

      it('should still work if the object is empty', () => {
        mount({
          resultFields: {
            foo: { raw: false, snippet: true, snippetSize: 5 },
            bar: {},
          },
        });
        jest.spyOn(ResultSettingsLogic.actions, 'updateField');

        ResultSettingsLogic.actions.toggleRawForField('bar');

        expect(ResultSettingsLogic.actions.updateField).toHaveBeenCalledWith('bar', {
          raw: true,
        });
      });
    });

    describe('toggleSnippetForField', () => {
      it('should toggle the raw value on for a field, always setting the snippet size to 100', () => {
        mount({
          resultFields: {
            foo: { raw: false, snippet: true, snippetSize: 5 },
            bar: { raw: false, snippet: false },
          },
        });
        jest.spyOn(ResultSettingsLogic.actions, 'updateField');

        ResultSettingsLogic.actions.toggleSnippetForField('bar');

        expect(ResultSettingsLogic.actions.updateField).toHaveBeenCalledWith('bar', {
          raw: false,
          snippet: true,
          snippetSize: 100,
        });
      });

      it('should remove rawSize value when toggling off', () => {
        mount({
          resultFields: {
            foo: { raw: false, snippet: true, snippetSize: 5 },
            bar: { raw: false, snippet: true, snippetSize: 5 },
          },
        });
        jest.spyOn(ResultSettingsLogic.actions, 'updateField');

        ResultSettingsLogic.actions.toggleSnippetForField('bar');

        expect(ResultSettingsLogic.actions.updateField).toHaveBeenCalledWith('bar', {
          raw: false,
          snippet: false,
        });
      });

      it('should still work if the object is empty', () => {
        mount({
          resultFields: {
            foo: { raw: false, snippet: true, snippetSize: 5 },
            bar: {},
          },
        });
        jest.spyOn(ResultSettingsLogic.actions, 'updateField');

        ResultSettingsLogic.actions.toggleSnippetForField('bar');

        expect(ResultSettingsLogic.actions.updateField).toHaveBeenCalledWith('bar', {
          snippet: true,
          snippetSize: 100,
        });
      });
    });

    describe('toggleSnippetFallbackForField', () => {
      it('should toggle the snippetFallback value for a field', () => {
        mount({
          resultFields: {
            foo: { raw: false, snippet: true, snippetSize: 5, snippetFallback: true },
            bar: { raw: false, snippet: false },
          },
        });
        jest.spyOn(ResultSettingsLogic.actions, 'updateField');

        ResultSettingsLogic.actions.toggleSnippetFallbackForField('foo');

        expect(ResultSettingsLogic.actions.updateField).toHaveBeenCalledWith('foo', {
          raw: false,
          snippet: true,
          snippetSize: 5,
          snippetFallback: false,
        });
      });
    });

    describe('updateRawSizeForField', () => {
      it('should update the rawSize value for a field', () => {
        mount({
          resultFields: {
            foo: { raw: false, snippet: true, snippetSize: 5, snippetFallback: true },
            bar: { raw: true, rawSize: 5, snippet: false },
          },
        });
        jest.spyOn(ResultSettingsLogic.actions, 'updateField');

        ResultSettingsLogic.actions.updateRawSizeForField('bar', 7);

        expect(ResultSettingsLogic.actions.updateField).toHaveBeenCalledWith('bar', {
          raw: true,
          rawSize: 7,
          snippet: false,
        });
      });
    });

    describe('updateSnippetSizeForField', () => {
      it('should update the snippetSize value for a field', () => {
        mount({
          resultFields: {
            foo: { raw: false, snippet: true, snippetSize: 5, snippetFallback: true },
            bar: { raw: true, rawSize: 5, snippet: false },
          },
        });
        jest.spyOn(ResultSettingsLogic.actions, 'updateField');

        ResultSettingsLogic.actions.updateSnippetSizeForField('foo', 7);

        expect(ResultSettingsLogic.actions.updateField).toHaveBeenCalledWith('foo', {
          raw: false,
          snippet: true,
          snippetSize: 7,
          snippetFallback: true,
        });
      });
    });

    describe('initializeResultSettingsData', () => {
      it('should remove the snippet size set on a field', () => {
        mount({
          resultFields: {
            foo: { raw: false, snippet: true, snippetSize: 5 },
            bar: { raw: true, rawSize: 5, snippet: false },
          },
        });
        jest.spyOn(ResultSettingsLogic.actions, 'updateField');

        ResultSettingsLogic.actions.clearSnippetSizeForField('foo');

        expect(ResultSettingsLogic.actions.updateField).toHaveBeenCalledWith('foo', {
          raw: false,
          snippet: true,
        });
      });
    });

    describe('initializeResultFields', () => {
      it('should make an API call and set state based on the response', async () => {
        mount();
        http.get.mockReturnValueOnce(
          Promise.resolve({
            searchSettings: {
              result_fields: serverFieldResultSettings,
            },
            schema,
            schemaConflicts,
          })
        );
        jest.spyOn(ResultSettingsLogic.actions, 'initializeResultFields');

        ResultSettingsLogic.actions.initializeResultSettingsData();
        await nextTick();

        expect(http.get).toHaveBeenCalledWith(
          '/api/app_search/engines/test-engine/result_settings/details'
        );
        expect(ResultSettingsLogic.actions.initializeResultFields).toHaveBeenCalledWith(
          serverFieldResultSettings,
          schema,
          schemaConflicts
        );
      });

      it('handles errors', async () => {
        mount();
        http.get.mockReturnValueOnce(Promise.reject('error'));

        ResultSettingsLogic.actions.initializeResultSettingsData();
        await nextTick();

        expect(flashAPIErrors).toHaveBeenCalledWith('error');
      });
    });

    describe('saveResultSettings', () => {
      it('should make an API call to update result settings and update state accordingly', async () => {
        mount({
          schema,
        });
        http.put.mockReturnValueOnce(
          Promise.resolve({
            result_fields: serverFieldResultSettings,
          })
        );
        jest.spyOn(ResultSettingsLogic.actions, 'saving');
        jest.spyOn(ResultSettingsLogic.actions, 'initializeResultFields');

        ResultSettingsLogic.actions.saveResultSettings(serverFieldResultSettings);

        expect(ResultSettingsLogic.actions.saving).toHaveBeenCalled();

        await nextTick();

        expect(http.put).toHaveBeenCalledWith(
          '/api/app_search/engines/test-engine/result_settings',
          {
            body: JSON.stringify({
              result_fields: serverFieldResultSettings,
            }),
          }
        );
        expect(ResultSettingsLogic.actions.initializeResultFields).toHaveBeenCalledWith(
          serverFieldResultSettings,
          schema
        );
      });

      it('handles errors', async () => {
        mount();
        http.put.mockReturnValueOnce(Promise.reject('error'));

        ResultSettingsLogic.actions.saveResultSettings(serverFieldResultSettings);
        await nextTick();

        expect(flashAPIErrors).toHaveBeenCalledWith('error');
      });
    });
  });
});
