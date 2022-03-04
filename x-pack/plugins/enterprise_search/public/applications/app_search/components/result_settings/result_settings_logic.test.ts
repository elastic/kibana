/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter, mockHttpValues } from '../../../__mocks__/kea_logic';
import { mockEngineValues } from '../../__mocks__';

import { omit } from 'lodash';

import { nextTick } from '@kbn/test-jest-helpers';

import { Schema, SchemaConflicts, SchemaType } from '../../../shared/schema/types';

import { itShowsServerErrorAsFlashMessage } from '../../../test_helpers';

import { ServerFieldResultSettingObject } from './types';

import { ResultSettingsLogic } from '.';

// toHaveBeenCalledWith uses toEqual which is a more lenient check. We have a couple of
// methods that need a stricter check, using `toStrictEqual`.
const expectToHaveBeenCalledWithStrict = (
  mock: jest.Mock,
  expectedParam1: string,
  expectedParam2: object
) => {
  const [param1, param2] = mock.mock.calls[0];
  expect(param1).toEqual(expectedParam1);
  expect(param2).toStrictEqual(expectedParam2);
};

describe('ResultSettingsLogic', () => {
  const { mount } = new LogicMounter(ResultSettingsLogic);

  const DEFAULT_VALUES = {
    dataLoading: true,
    saving: false,
    resultFields: {},
    lastSavedResultFields: {},
    schema: {},
    schemaConflicts: {},
  };

  const SELECTORS = {
    serverResultFields: {},
    reducedServerResultFields: {},
    resultFieldsEmpty: true,
    resultFieldsAtDefaultSettings: true,
    stagedUpdates: false,
    nonTextResultFields: {},
    textResultFields: {},
    queryPerformanceScore: 0,
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
        foo: SchemaType.Text,
        bar: SchemaType.Number,
        baz: SchemaType.Text,
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

    describe('clearAllFields', () => {
      it('should remove all settings that have been set for each field', () => {
        mount({
          resultFields: {
            quuz: { raw: false, snippet: false, snippetFallback: false },
            corge: { raw: true, snippet: false, snippetFallback: true },
          },
        });

        ResultSettingsLogic.actions.clearAllFields();

        expect(resultSettingLogicValues()).toEqual({
          ...DEFAULT_VALUES,
          resultFields: {
            quuz: {},
            corge: {},
          },
        });
      });
    });

    describe('resetAllFields', () => {
      it('should reset all settings to their default values per field', () => {
        mount({
          resultFields: {
            quuz: { raw: true, snippet: true, snippetFallback: true },
            corge: { raw: true, snippet: true, snippetFallback: true },
          },
        });

        ResultSettingsLogic.actions.resetAllFields();

        expect(resultSettingLogicValues()).toEqual({
          ...DEFAULT_VALUES,
          resultFields: {
            quuz: { raw: true, snippet: false, snippetFallback: false },
            corge: { raw: true, snippet: false, snippetFallback: false },
          },
        });
      });
    });

    describe('updateField', () => {
      const initialValues = {
        resultFields: {
          foo: { raw: true, snippet: true, snippetFallback: true },
          bar: { raw: true, snippet: true, snippetFallback: true },
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
          resultFields: {
            foo: { raw: true, snippet: false, snippetFallback: false },
            bar: { raw: true, snippet: true, snippetFallback: true },
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
      it('sets saving to true', () => {
        mount({
          saving: false,
        });

        ResultSettingsLogic.actions.saving();

        expect(resultSettingLogicValues()).toEqual({
          ...DEFAULT_VALUES,
          saving: true,
        });
      });
    });
  });

  describe('selectors', () => {
    describe('textResultFields', () => {
      it('should return only resultFields that have a type of "text" in the engine schema', () => {
        mount({
          schema: {
            foo: 'text',
            bar: 'number',
            baz: 'text',
          },
          resultFields: {
            foo: { raw: true, rawSize: 5 },
            bar: { raw: true, rawSize: 5 },
            baz: { raw: true, rawSize: 5 },
          },
        });

        expect(ResultSettingsLogic.values.textResultFields).toEqual({
          baz: { raw: true, rawSize: 5 },
          foo: { raw: true, rawSize: 5 },
        });
      });
    });

    describe('nonTextResultFields', () => {
      it('should return only resultFields that have a type other than "text" in the engine schema', () => {
        mount({
          schema: {
            foo: 'text',
            bar: 'number',
            baz: 'text',
          },
          resultFields: {
            foo: { raw: true, rawSize: 5 },
            bar: { raw: true, rawSize: 5 },
            baz: { raw: true, rawSize: 5 },
          },
        });

        expect(ResultSettingsLogic.values.nonTextResultFields).toEqual({
          bar: { raw: true, rawSize: 5 },
        });
      });
    });

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
      it('should return true if no raw or snippet fields are enabled', () => {
        mount({
          resultFields: {
            foo: { raw: false },
            bar: {},
            baz: { raw: false, snippet: false },
          },
        });

        expect(ResultSettingsLogic.values.resultFieldsEmpty).toEqual(true);
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

    describe('serverResultFields', () => {
      it('returns resultFields formatted for the server', () => {
        mount({
          resultFields: {
            foo: {
              raw: true,
              rawSize: 5,
              snippet: true,
              snippetFallback: true,
              snippetSize: 3,
            },
            bar: {},
            baz: {
              raw: false,
              snippet: false,
              snippetFallback: false,
            },
          },
        });

        expect(ResultSettingsLogic.values.serverResultFields).toEqual({
          foo: {
            raw: { size: 5 },
            snippet: { fallback: true, size: 3 },
          },
          bar: {},
          baz: {},
        });
      });
    });

    describe('reducedServerResultFields', () => {
      it('returns server formatted fields with empty settings filtered out', () => {
        mount({
          resultFields: {
            foo: {
              raw: true,
              rawSize: 5,
            },
            bar: {},
          },
        });

        expect(ResultSettingsLogic.values.reducedServerResultFields).toEqual({
          // bar was filtered out because it has neither raw nor snippet data set
          foo: { raw: { size: 5 } },
        });
      });
    });

    describe('queryPerformanceScore', () => {
      describe('returns a score for the current query performance based on the result settings', () => {
        it('considers a text value with raw set (but no size) as worth 1.5', () => {
          mount({
            resultFields: { foo: { raw: true } },
            schema: { foo: SchemaType.Text },
          });
          expect(ResultSettingsLogic.values.queryPerformanceScore).toEqual(1.5);
        });

        it('considers a text value with raw set and a size over 250 as also worth 1.5', () => {
          mount({
            resultFields: { foo: { raw: true, rawSize: 251 } },
            schema: { foo: SchemaType.Text },
          });
          expect(ResultSettingsLogic.values.queryPerformanceScore).toEqual(1.5);
        });

        it('considers a text value with raw set and a size less than or equal to 250 as worth 1', () => {
          mount({
            resultFields: { foo: { raw: true, rawSize: 250 } },
            schema: { foo: SchemaType.Text },
          });
          expect(ResultSettingsLogic.values.queryPerformanceScore).toEqual(1);
        });

        it('considers a text value with a snippet set as worth 2', () => {
          mount({
            resultFields: { foo: { snippet: true, snippetSize: 50, snippetFallback: true } },
            schema: { foo: SchemaType.Text },
          });
          expect(ResultSettingsLogic.values.queryPerformanceScore).toEqual(2);
        });

        it('will sum raw and snippet values if both are set', () => {
          mount({
            resultFields: { foo: { snippet: true, raw: true } },
            schema: { foo: SchemaType.Text },
          });
          // 1.5 (raw) + 2 (snippet) = 3.5
          expect(ResultSettingsLogic.values.queryPerformanceScore).toEqual(3.5);
        });

        it('considers a non-text value with raw set as 0.2', () => {
          mount({
            resultFields: { foo: { raw: true } },
            schema: { foo: SchemaType.Number },
          });
          expect(ResultSettingsLogic.values.queryPerformanceScore).toEqual(0.2);
        });

        it('can sum variations of all the prior', () => {
          mount({
            resultFields: {
              foo: { raw: true },
              bar: { raw: true, snippet: true },
              baz: { raw: true },
            },
            schema: {
              foo: SchemaType.Text,
              bar: SchemaType.Text,
              baz: SchemaType.Number,
            },
          });
          // 1.5 (foo) + 3.5 (bar) + baz (.2) = 5.2
          expect(ResultSettingsLogic.values.queryPerformanceScore).toEqual(5.2);
        });
      });
    });
  });

  describe('listeners', () => {
    const { http } = mockHttpValues;
    let confirmSpy: jest.SpyInstance;

    beforeAll(() => {
      confirmSpy = jest.spyOn(window, 'confirm');
    });
    afterAll(() => confirmSpy.mockRestore());

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
          },
        });
        jest.spyOn(ResultSettingsLogic.actions, 'updateField');

        ResultSettingsLogic.actions.clearRawSizeForField('foo');

        expectToHaveBeenCalledWithStrict(
          ResultSettingsLogic.actions.updateField as jest.Mock,
          'foo',
          {
            raw: true,
            snippet: false,
          }
        );
      });
    });

    describe('clearSnippetSizeForField', () => {
      it('should remove the snippet size set on a field', () => {
        mount({
          resultFields: {
            foo: { raw: false, snippet: true, snippetSize: 5 },
          },
        });
        jest.spyOn(ResultSettingsLogic.actions, 'updateField');

        ResultSettingsLogic.actions.clearSnippetSizeForField('foo');

        expectToHaveBeenCalledWithStrict(
          ResultSettingsLogic.actions.updateField as jest.Mock,
          'foo',
          {
            raw: false,
            snippet: true,
          }
        );
      });
    });

    describe('toggleRawForField', () => {
      it('should toggle the raw value on for a field', () => {
        mount({
          resultFields: {
            bar: { raw: false, snippet: false },
          },
        });
        jest.spyOn(ResultSettingsLogic.actions, 'updateField');

        ResultSettingsLogic.actions.toggleRawForField('bar');

        expectToHaveBeenCalledWithStrict(
          ResultSettingsLogic.actions.updateField as jest.Mock,
          'bar',
          {
            raw: true,
            snippet: false,
          }
        );
      });

      it('should maintain rawSize if it was set prior', () => {
        mount({
          resultFields: {
            bar: { raw: false, rawSize: 10, snippet: false },
          },
        });
        jest.spyOn(ResultSettingsLogic.actions, 'updateField');

        ResultSettingsLogic.actions.toggleRawForField('bar');

        expectToHaveBeenCalledWithStrict(
          ResultSettingsLogic.actions.updateField as jest.Mock,
          'bar',
          {
            raw: true,
            rawSize: 10,
            snippet: false,
          }
        );
      });

      it('should remove rawSize value when toggling off', () => {
        mount({
          resultFields: {
            bar: { raw: true, rawSize: 5, snippet: false },
          },
        });
        jest.spyOn(ResultSettingsLogic.actions, 'updateField');

        ResultSettingsLogic.actions.toggleRawForField('bar');

        expectToHaveBeenCalledWithStrict(
          ResultSettingsLogic.actions.updateField as jest.Mock,
          'bar',
          {
            raw: false,
            snippet: false,
          }
        );
      });

      it('should still work if the object is empty', () => {
        mount({
          resultFields: {
            bar: {},
          },
        });
        jest.spyOn(ResultSettingsLogic.actions, 'updateField');

        ResultSettingsLogic.actions.toggleRawForField('bar');

        expectToHaveBeenCalledWithStrict(
          ResultSettingsLogic.actions.updateField as jest.Mock,
          'bar',
          {
            raw: true,
          }
        );
      });
    });

    describe('toggleSnippetForField', () => {
      it('should toggle the raw value on for a field, always setting the snippet size to 100', () => {
        mount({
          resultFields: {
            bar: { raw: false, snippet: false },
          },
        });
        jest.spyOn(ResultSettingsLogic.actions, 'updateField');

        ResultSettingsLogic.actions.toggleSnippetForField('bar');

        expectToHaveBeenCalledWithStrict(
          ResultSettingsLogic.actions.updateField as jest.Mock,
          'bar',
          {
            raw: false,
            snippet: true,
            snippetSize: 100,
          }
        );
      });

      it('should remove rawSize value when toggling off', () => {
        mount({
          resultFields: {
            bar: { raw: false, snippet: true, snippetSize: 5 },
          },
        });
        jest.spyOn(ResultSettingsLogic.actions, 'updateField');

        ResultSettingsLogic.actions.toggleSnippetForField('bar');

        expectToHaveBeenCalledWithStrict(
          ResultSettingsLogic.actions.updateField as jest.Mock,
          'bar',
          {
            raw: false,
            snippet: false,
          }
        );
      });

      it('should still work if the object is empty', () => {
        mount({
          resultFields: {
            bar: {},
          },
        });
        jest.spyOn(ResultSettingsLogic.actions, 'updateField');

        ResultSettingsLogic.actions.toggleSnippetForField('bar');

        expectToHaveBeenCalledWithStrict(
          ResultSettingsLogic.actions.updateField as jest.Mock,
          'bar',
          {
            snippet: true,
            snippetSize: 100,
          }
        );
      });
    });

    describe('toggleSnippetFallbackForField', () => {
      it('should toggle the snippetFallback value for a field', () => {
        mount({
          resultFields: {
            foo: { raw: false, snippet: true, snippetSize: 5, snippetFallback: true },
          },
        });
        jest.spyOn(ResultSettingsLogic.actions, 'updateField');

        ResultSettingsLogic.actions.toggleSnippetFallbackForField('foo');

        expectToHaveBeenCalledWithStrict(
          ResultSettingsLogic.actions.updateField as jest.Mock,
          'foo',
          {
            raw: false,
            snippet: true,
            snippetSize: 5,
            snippetFallback: false,
          }
        );
      });
    });

    describe('updateRawSizeForField', () => {
      it('should update the rawSize value for a field', () => {
        mount({
          resultFields: {
            bar: { raw: true, rawSize: 5, snippet: false },
          },
        });
        jest.spyOn(ResultSettingsLogic.actions, 'updateField');

        ResultSettingsLogic.actions.updateRawSizeForField('bar', 7);

        expectToHaveBeenCalledWithStrict(
          ResultSettingsLogic.actions.updateField as jest.Mock,
          'bar',
          {
            raw: true,
            rawSize: 7,
            snippet: false,
          }
        );
      });
    });

    describe('updateSnippetSizeForField', () => {
      it('should update the snippetSize value for a field', () => {
        mount({
          resultFields: {
            foo: { raw: false, snippet: true, snippetSize: 5, snippetFallback: true },
          },
        });
        jest.spyOn(ResultSettingsLogic.actions, 'updateField');

        ResultSettingsLogic.actions.updateSnippetSizeForField('foo', 7);

        expectToHaveBeenCalledWithStrict(
          ResultSettingsLogic.actions.updateField as jest.Mock,
          'foo',
          {
            raw: false,
            snippet: true,
            snippetSize: 7,
            snippetFallback: true,
          }
        );
      });
    });

    describe('initializeResultSettingsData', () => {
      it('should remove the snippet size set on a field', () => {
        mount({
          resultFields: {
            foo: { raw: false, snippet: true, snippetSize: 5 },
          },
        });
        jest.spyOn(ResultSettingsLogic.actions, 'updateField');

        ResultSettingsLogic.actions.clearSnippetSizeForField('foo');

        expectToHaveBeenCalledWithStrict(
          ResultSettingsLogic.actions.updateField as jest.Mock,
          'foo',
          {
            raw: false,
            snippet: true,
          }
        );
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
          '/internal/app_search/engines/test-engine/result_settings/details'
        );
        expect(ResultSettingsLogic.actions.initializeResultFields).toHaveBeenCalledWith(
          serverFieldResultSettings,
          schema,
          schemaConflicts
        );
      });

      itShowsServerErrorAsFlashMessage(http.get, () => {
        mount();
        ResultSettingsLogic.actions.initializeResultSettingsData();
      });
    });

    describe('confirmResetAllFields', () => {
      it('will reset all fields as long as the user confirms the action', async () => {
        mount();
        confirmSpy.mockImplementation(() => true);
        jest.spyOn(ResultSettingsLogic.actions, 'resetAllFields');

        ResultSettingsLogic.actions.confirmResetAllFields();

        expect(ResultSettingsLogic.actions.resetAllFields).toHaveBeenCalled();
      });

      it('will do nothing if the user cancels the action', async () => {
        mount();
        confirmSpy.mockImplementation(() => false);
        jest.spyOn(ResultSettingsLogic.actions, 'resetAllFields');

        ResultSettingsLogic.actions.confirmResetAllFields();

        expect(ResultSettingsLogic.actions.resetAllFields).not.toHaveBeenCalled();
      });
    });

    describe('saveResultSettings', () => {
      beforeEach(() => {
        confirmSpy.mockImplementation(() => true);
      });

      it('should make an API call to update result settings and update state accordingly', async () => {
        const resultFields = {
          foo: { raw: true, rawSize: 100 },
        };

        const serverResultFields = {
          foo: { raw: { size: 100 } },
        };

        mount({
          schema,
          resultFields,
        });
        http.put.mockReturnValueOnce(
          Promise.resolve({
            result_fields: serverResultFields,
          })
        );
        jest.spyOn(ResultSettingsLogic.actions, 'saving');
        jest.spyOn(ResultSettingsLogic.actions, 'initializeResultFields');

        ResultSettingsLogic.actions.saveResultSettings();

        expect(ResultSettingsLogic.actions.saving).toHaveBeenCalled();

        await nextTick();

        expect(http.put).toHaveBeenCalledWith(
          '/internal/app_search/engines/test-engine/result_settings',
          {
            body: JSON.stringify({
              result_fields: serverResultFields,
            }),
          }
        );
        expect(ResultSettingsLogic.actions.initializeResultFields).toHaveBeenCalledWith(
          serverResultFields,
          schema
        );
      });

      itShowsServerErrorAsFlashMessage(http.put, () => {
        mount();
        ResultSettingsLogic.actions.saveResultSettings();
      });

      it('does nothing if the user does not confirm', async () => {
        mount();
        confirmSpy.mockImplementation(() => false);

        ResultSettingsLogic.actions.saveResultSettings();
        await nextTick();

        expect(http.put).not.toHaveBeenCalled();
      });
    });
  });
});
