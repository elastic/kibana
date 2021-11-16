/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';
import { omit, isEqual } from 'lodash';

import { i18n } from '@kbn/i18n';

import { flashAPIErrors, flashSuccessToast } from '../../../shared/flash_messages';
import { HttpLogic } from '../../../shared/http';
import { Schema, SchemaConflicts, SchemaType } from '../../../shared/schema/types';
import { EngineLogic } from '../engine';

import { DEFAULT_SNIPPET_SIZE } from './constants';
import {
  FieldResultSetting,
  FieldResultSettingObject,
  ServerFieldResultSetting,
  ServerFieldResultSettingObject,
} from './types';

import {
  areFieldsAtDefaultSettings,
  areFieldsEmpty,
  clearAllFields,
  convertServerResultFieldsToResultFields,
  convertToServerFieldResultSetting,
  resetAllFields,
  splitResultFields,
} from './utils';

interface ResultSettingsActions {
  initializeResultFields(
    serverResultFields: ServerFieldResultSettingObject,
    schema: Schema,
    schemaConflicts?: SchemaConflicts
  ): {
    resultFields: FieldResultSettingObject;
    schema: Schema;
    schemaConflicts: SchemaConflicts;
  };
  clearAllFields(): void;
  resetAllFields(): void;
  updateField(
    fieldName: string,
    settings: FieldResultSetting | {}
  ): { fieldName: string; settings: FieldResultSetting };
  saving(): void;
  // Listeners
  clearRawSizeForField(fieldName: string): { fieldName: string };
  clearSnippetSizeForField(fieldName: string): { fieldName: string };
  toggleRawForField(fieldName: string): { fieldName: string };
  toggleSnippetForField(fieldName: string): { fieldName: string };
  toggleSnippetFallbackForField(fieldName: string): { fieldName: string };
  updateRawSizeForField(fieldName: string, size: number): { fieldName: string; size: number };
  updateSnippetSizeForField(fieldName: string, size: number): { fieldName: string; size: number };
  initializeResultSettingsData(): void;
  confirmResetAllFields(): void;
  saveResultSettings(): void;
}

interface ResultSettingsValues {
  dataLoading: boolean;
  saving: boolean;
  resultFields: FieldResultSettingObject;
  lastSavedResultFields: FieldResultSettingObject;
  schema: Schema;
  schemaConflicts: SchemaConflicts;
  // Selectors
  textResultFields: FieldResultSettingObject;
  nonTextResultFields: FieldResultSettingObject;
  serverResultFields: ServerFieldResultSettingObject;
  resultFieldsAtDefaultSettings: boolean;
  resultFieldsEmpty: boolean;
  stagedUpdates: true;
  reducedServerResultFields: ServerFieldResultSettingObject;
  queryPerformanceScore: number;
}

const SAVE_CONFIRMATION_MESSAGE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.resultSettings.confirmSaveMessage',
  {
    defaultMessage:
      'The changes will start immediately. Make sure your applications are ready to accept the new search results!',
  }
);

const RESET_CONFIRMATION_MESSAGE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.resultSettings.confirmResetMessage',
  {
    defaultMessage:
      'Are you sure you want to restore result settings defaults? This will set all fields back to raw with no limits.',
  }
);

export const ResultSettingsLogic = kea<MakeLogicType<ResultSettingsValues, ResultSettingsActions>>({
  path: ['enterprise_search', 'app_search', 'result_settings_logic'],
  actions: () => ({
    initializeResultFields: (serverResultFields, schema, schemaConflicts) => {
      const resultFields = convertServerResultFieldsToResultFields(serverResultFields, schema);

      return {
        resultFields,
        schema,
        schemaConflicts,
      };
    },
    clearAllFields: () => true,
    resetAllFields: () => true,
    updateField: (fieldName, settings) => ({ fieldName, settings }),
    saving: () => true,
    clearRawSizeForField: (fieldName) => ({ fieldName }),
    clearSnippetSizeForField: (fieldName) => ({ fieldName }),
    toggleRawForField: (fieldName) => ({ fieldName }),
    toggleSnippetForField: (fieldName) => ({ fieldName }),
    toggleSnippetFallbackForField: (fieldName) => ({ fieldName }),
    updateRawSizeForField: (fieldName, size) => ({ fieldName, size }),
    updateSnippetSizeForField: (fieldName, size) => ({ fieldName, size }),
    initializeResultSettingsData: () => true,
    confirmResetAllFields: () => true,
    saveResultSettings: () => true,
  }),
  reducers: () => ({
    dataLoading: [
      true,
      {
        initializeResultFields: () => false,
      },
    ],
    saving: [
      false,
      {
        initializeResultFields: () => false,
        saving: () => true,
      },
    ],
    resultFields: [
      {},
      {
        initializeResultFields: (_, { resultFields }) => resultFields,
        clearAllFields: (resultFields) => clearAllFields(resultFields),
        resetAllFields: (resultFields) => resetAllFields(resultFields),
        updateField: (resultFields, { fieldName, settings }) =>
          resultFields.hasOwnProperty(fieldName)
            ? { ...resultFields, [fieldName]: settings }
            : resultFields,
      },
    ],
    lastSavedResultFields: [
      {},
      {
        initializeResultFields: (_, { resultFields }) => resultFields,
      },
    ],
    schema: [
      {},
      {
        initializeResultFields: (_, { schema }) => schema,
      },
    ],
    schemaConflicts: [
      {},
      {
        initializeResultFields: (_, { schemaConflicts }) => schemaConflicts || {},
      },
    ],
  }),
  selectors: ({ selectors }) => ({
    textResultFields: [
      () => [selectors.resultFields, selectors.schema],
      (resultFields: FieldResultSettingObject, schema: Schema) => {
        const { textResultFields } = splitResultFields(resultFields, schema);
        return textResultFields;
      },
    ],
    nonTextResultFields: [
      () => [selectors.resultFields, selectors.schema],
      (resultFields: FieldResultSettingObject, schema: Schema) => {
        const { nonTextResultFields } = splitResultFields(resultFields, schema);
        return nonTextResultFields;
      },
    ],
    serverResultFields: [
      () => [selectors.resultFields],
      (resultFields: FieldResultSettingObject) => {
        return Object.entries(resultFields).reduce((serverResultFields, [fieldName, settings]) => {
          return {
            ...serverResultFields,
            [fieldName]: convertToServerFieldResultSetting(settings as FieldResultSetting),
          };
        }, {});
      },
    ],
    resultFieldsAtDefaultSettings: [
      () => [selectors.resultFields],
      (resultFields) => areFieldsAtDefaultSettings(resultFields),
    ],
    resultFieldsEmpty: [
      () => [selectors.resultFields],
      (resultFields) => areFieldsEmpty(resultFields),
    ],
    stagedUpdates: [
      () => [selectors.lastSavedResultFields, selectors.resultFields],
      (lastSavedResultFields, resultFields) => !isEqual(lastSavedResultFields, resultFields),
    ],
    reducedServerResultFields: [
      () => [selectors.serverResultFields],
      (serverResultFields: ServerFieldResultSettingObject) =>
        Object.entries(serverResultFields).reduce(
          (acc: ServerFieldResultSettingObject, [fieldName, resultSetting]) => {
            if (resultSetting.raw || resultSetting.snippet) {
              acc[fieldName] = resultSetting;
            }
            return acc;
          },
          {}
        ),
    ],
    queryPerformanceScore: [
      () => [selectors.serverResultFields, selectors.schema],
      (serverResultFields: ServerFieldResultSettingObject, schema: Schema) => {
        return Object.entries(serverResultFields).reduce((acc, [fieldName, resultField]) => {
          let newAcc = acc;
          if (resultField.raw) {
            if (schema[fieldName] !== 'text') {
              newAcc += 0.2;
            } else if (
              typeof resultField.raw === 'object' &&
              resultField.raw.size &&
              resultField.raw.size <= 250
            ) {
              newAcc += 1.0;
            } else {
              newAcc += 1.5;
            }
          }
          if (resultField.snippet) {
            newAcc += 2.0;
          }
          return newAcc;
        }, 0);
      },
    ],
  }),
  listeners: ({ actions, values }) => ({
    clearRawSizeForField: ({ fieldName }) => {
      actions.updateField(fieldName, omit(values.resultFields[fieldName], ['rawSize']));
    },
    clearSnippetSizeForField: ({ fieldName }) => {
      actions.updateField(fieldName, omit(values.resultFields[fieldName], ['snippetSize']));
    },
    toggleRawForField: ({ fieldName }) => {
      // We cast this because it could be an empty object, which we can still treat as a FieldResultSetting safely
      const field = values.resultFields[fieldName] as FieldResultSetting;
      const raw = !field.raw;

      actions.updateField(fieldName, {
        ...omit(field, ['rawSize']),
        raw,
        ...(raw && field.rawSize ? { rawSize: field.rawSize } : {}),
      });
    },
    toggleSnippetForField: ({ fieldName }) => {
      // We cast this because it could be an empty object, which we can still treat as a FieldResultSetting safely
      const field = values.resultFields[fieldName] as FieldResultSetting;
      const snippet = !field.snippet;

      actions.updateField(fieldName, {
        ...omit(field, ['snippetSize']),
        snippet,
        ...(snippet ? { snippetSize: DEFAULT_SNIPPET_SIZE } : {}),
      });
    },
    toggleSnippetFallbackForField: ({ fieldName }) => {
      // We cast this because it could be an empty object, which we can still treat as a FieldResultSetting safely
      const field = values.resultFields[fieldName] as FieldResultSetting;
      actions.updateField(fieldName, {
        ...field,
        snippetFallback: !field.snippetFallback,
      });
    },
    updateRawSizeForField: ({ fieldName, size }) => {
      actions.updateField(fieldName, { ...values.resultFields[fieldName], rawSize: size });
    },
    updateSnippetSizeForField: ({ fieldName, size }) => {
      actions.updateField(fieldName, { ...values.resultFields[fieldName], snippetSize: size });
    },
    initializeResultSettingsData: async () => {
      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;

      const url = `/internal/app_search/engines/${engineName}/result_settings/details`;

      try {
        const {
          schema,
          schemaConflicts,
          searchSettings: { result_fields: serverFieldResultSettings },
        } = await http.get<{
          schema: Record<string, SchemaType>;
          schemaConflicts?: SchemaConflicts;
          searchSettings: { result_fields: Record<string, ServerFieldResultSetting> };
        }>(url);

        actions.initializeResultFields(serverFieldResultSettings, schema, schemaConflicts);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    confirmResetAllFields: () => {
      if (window.confirm(RESET_CONFIRMATION_MESSAGE)) {
        actions.resetAllFields();
      }
    },
    saveResultSettings: async () => {
      if (window.confirm(SAVE_CONFIRMATION_MESSAGE)) {
        actions.saving();

        const { http } = HttpLogic.values;
        const { engineName } = EngineLogic.values;
        const url = `/internal/app_search/engines/${engineName}/result_settings`;

        actions.saving();

        try {
          const response = await http.put<{
            result_fields: Record<string, ServerFieldResultSetting>;
          }>(url, {
            body: JSON.stringify({
              result_fields: values.reducedServerResultFields,
            }),
          });

          actions.initializeResultFields(response.result_fields, values.schema);
          flashSuccessToast(
            i18n.translate(
              'xpack.enterpriseSearch.appSearch.engine.resultSettings.saveSuccessMessage',
              {
                defaultMessage: 'Result settings were saved',
              }
            )
          );
        } catch (e) {
          flashAPIErrors(e);
        }
      }
    },
  }),
});
