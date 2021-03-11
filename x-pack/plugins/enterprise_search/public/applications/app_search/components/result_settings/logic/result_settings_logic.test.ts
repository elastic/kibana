/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter } from '../../../../__mocks__';

import { OpenModal } from '../types';

import { ResultSettingsLogic } from '.';

describe('ResultSettingsLogic', () => {
  const { mount } = new LogicMounter(ResultSettingsLogic);

  const DEFAULT_VALUES = {
    openModal: OpenModal.None,
    nonTextResultFields: {},
    resultFields: {},
    serverResultFields: {},
    textResultFields: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('has expected default values', () => {
    mount();
    expect(ResultSettingsLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
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
        mount({
          openModal: OpenModal.ConfirmSaveModal,
        });

        ResultSettingsLogic.actions.resetAllFields();

        expect(ResultSettingsLogic.values).toEqual({
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
  });
});
